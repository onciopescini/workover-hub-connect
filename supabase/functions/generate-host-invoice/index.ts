import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceRequest {
  payment_id: string;
  booking_id: string;
  host_id: string;
  breakdown: {
    host_fee: number;
    host_vat: number;
    total: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { payment_id, booking_id, host_id, breakdown }: InvoiceRequest = await req.json();
    
    console.log('🧾 Generating host invoice', { payment_id, booking_id, host_id });

    // 1. Get payment details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('id, amount, booking_id, stripe_session_id')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      throw new Error(`Payment not found: ${paymentError?.message}`);
    }

    // 2. Get host tax details
    const { data: taxDetails, error: taxError } = await supabaseAdmin
      .from('tax_details')
      .select('*')
      .eq('profile_id', host_id)
      .eq('is_primary', true)
      .maybeSingle();

    if (taxError) {
      console.error('Error fetching tax details:', taxError);
    }

    // 3. Get host profile fallback data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, vat_number, fiscal_regime, pec_email, sdi_code, legal_address')
      .eq('id', host_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`Host profile not found: ${profileError?.message}`);
    }

    // 4. Generate progressive invoice number
    const year = new Date().getFullYear();
    const { data: lastInvoice } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `WO/${year}/%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let invoiceNumber: string;
    if (lastInvoice?.invoice_number) {
      const lastNumber = parseInt(lastInvoice.invoice_number.split('/')[2]);
      invoiceNumber = `WO/${year}/${String(lastNumber + 1).padStart(5, '0')}`;
    } else {
      invoiceNumber = `WO/${year}/00001`;
    }

    console.log('📄 Generated invoice number:', invoiceNumber);

    // 5. Calculate amounts
    const baseAmount = breakdown.host_fee;
    const vatAmount = breakdown.host_vat;
    const totalAmount = breakdown.total;
    const vatRate = 0.22;

    // 6. Prepare invoice data
    const invoiceDate = new Date().toISOString();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 giorni

    // 7. Create invoice record
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        payment_id,
        booking_id,
        recipient_id: host_id,
        recipient_type: 'host',
        issuer: 'WORKOVER_IT',
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate.toISOString(),
        base_amount: baseAmount,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        xml_delivery_status: 'draft'
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Failed to create invoice: ${invoiceError.message}`);
    }

    console.log('✅ Invoice created successfully', { invoiceId: invoice.id, invoiceNumber });

    // 8. Generate XML FatturaPA
    const xml = generateFatturaPA({
      invoiceNumber,
      invoiceDate,
      dueDate: dueDate.toISOString(),
      recipient: {
        name: `${profile.first_name} ${profile.last_name}`,
        vatNumber: taxDetails?.vat_number || profile.vat_number || '',
        fiscalCode: taxDetails?.fiscal_code || '',
        address: taxDetails?.legal_address || profile.legal_address || '',
        pec: taxDetails?.pec_email || profile.pec_email || '',
        sdiCode: taxDetails?.sdi_code || profile.sdi_code || ''
      },
      amounts: {
        base: baseAmount,
        vat: vatAmount,
        total: totalAmount,
        vatRate: vatRate * 100
      }
    });

    // 9. Upload XML to Supabase Storage
    const xmlFileName = `invoices/${year}/${invoiceNumber.replace(/\//g, '_')}.xml`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('documents')
      .upload(xmlFileName, xml, {
        contentType: 'application/xml',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading XML:', uploadError);
    } else {
      // Get public URL
      const { data: urlData } = supabaseAdmin
        .storage
        .from('documents')
        .getPublicUrl(xmlFileName);

      // Update invoice with XML URL
      await supabaseAdmin
        .from('invoices')
        .update({ xml_file_url: urlData.publicUrl })
        .eq('id', invoice.id);

      console.log('📎 XML uploaded:', urlData.publicUrl);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          id: invoice.id,
          invoice_number: invoiceNumber,
          total_amount: totalAmount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error generating invoice:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Utility function to generate FatturaPA XML
function generateFatturaPA(data: {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  recipient: {
    name: string;
    vatNumber: string;
    fiscalCode: string;
    address: string;
    pec: string;
    sdiCode: string;
  };
  amounts: {
    base: number;
    vat: number;
    total: number;
    vatRate: number;
  };
}): string {
  const date = new Date(data.invoiceDate).toISOString().split('T')[0];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>12345678901</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>00001</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${data.recipient.sdiCode || '0000000'}</CodiceDestinatario>
      ${data.recipient.pec ? `<PECDestinatario>${data.recipient.pec}</PECDestinatario>` : ''}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>12345678901</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>WORKOVER SRL</Denominazione>
        </Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Example 1</Indirizzo>
        <CAP>00100</CAP>
        <Comune>Roma</Comune>
        <Provincia>RM</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        ${data.recipient.vatNumber ? `
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${data.recipient.vatNumber}</IdCodice>
        </IdFiscaleIVA>` : ''}
        ${data.recipient.fiscalCode ? `<CodiceFiscale>${data.recipient.fiscalCode}</CodiceFiscale>` : ''}
        <Anagrafica>
          <Denominazione>${data.recipient.name}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${data.recipient.address || 'N/A'}</Indirizzo>
        <CAP>00000</CAP>
        <Comune>N/A</Comune>
        <Provincia>XX</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${date}</Data>
        <Numero>${data.invoiceNumber}</Numero>
        <ImportoTotaleDocumento>${data.amounts.total.toFixed(2)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Commissione servizio piattaforma Workover</Descrizione>
        <Quantita>1.00</Quantita>
        <PrezzoUnitario>${data.amounts.base.toFixed(2)}</PrezzoUnitario>
        <PrezzoTotale>${data.amounts.base.toFixed(2)}</PrezzoTotale>
        <AliquotaIVA>${data.amounts.vatRate.toFixed(2)}</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>${data.amounts.vatRate.toFixed(2)}</AliquotaIVA>
        <ImponibileImporto>${data.amounts.base.toFixed(2)}</ImponibileImporto>
        <Imposta>${data.amounts.vat.toFixed(2)}</Imposta>
      </DatiRiepilogo>
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>MP05</ModalitaPagamento>
        <DataScadenzaPagamento>${new Date(data.dueDate).toISOString().split('T')[0]}</DataScadenzaPagamento>
        <ImportoPagamento>${data.amounts.total.toFixed(2)}</ImportoPagamento>
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}
