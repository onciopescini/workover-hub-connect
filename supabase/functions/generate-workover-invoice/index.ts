import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingData {
  id: string;
  space_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  spaces: {
    title: string;
    host_id: string;
  };
}

interface PaymentData {
  id: string;
  booking_id: string;
  amount: number;
  platform_fee: number;
  host_amount: number;
  buyer_fee: number;
}

interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  fiscal_regime: string | null;
  pec_email: string | null;
  sdi_code: string | null;
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

    const { booking_id } = await req.json();
    console.log('[WORKOVER-INVOICE] Processing booking:', booking_id);

    // 1. Fetch booking data
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*, spaces(title, host_id)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    const bookingData = booking as unknown as BookingData;

    // Only process served bookings
    if (bookingData.status !== 'served') {
      return new Response(
        JSON.stringify({ error: 'Booking not served yet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Fetch payment data
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('payment_status', 'completed')
      .single();

    if (paymentError || !payment) {
      throw new Error(`Payment not found: ${paymentError?.message}`);
    }

    const paymentData = payment as unknown as PaymentData;

    // Check if invoice already exists
    if (paymentData.workover_invoice_id) {
      console.log('[WORKOVER-INVOICE] Invoice already exists:', paymentData.workover_invoice_id);
      return new Response(
        JSON.stringify({ message: 'Invoice already exists', invoice_id: paymentData.workover_invoice_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 3. Fetch host and coworker profiles
    const { data: hostProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, fiscal_regime, pec_email, sdi_code')
      .eq('id', bookingData.spaces.host_id)
      .single();

    const { data: coworkerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, fiscal_regime, pec_email, sdi_code')
      .eq('id', bookingData.user_id)
      .single();

    const host = hostProfile as unknown as ProfileData;
    const coworker = coworkerProfile as unknown as ProfileData;

    // 4. Determine recipient type
    let recipientType = 'host_privato';
    let recipientId = host.id;
    
    if (host.fiscal_regime === 'forfettario' || host.fiscal_regime === 'ordinario') {
      recipientType = 'host_piva';
    }

    // 5. Generate invoice number (WF-YYYY-XXXXX)
    const year = new Date().getFullYear();
    const { count } = await supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .like('invoice_number', `WF-${year}-%`);

    const invoiceNumber = `WF-${year}-${String((count || 0) + 1).padStart(5, '0')}`;

    // 6. Calculate amounts (service fee = platform_fee)
    const baseAmount = paymentData.platform_fee || (paymentData.buyer_fee || 0);
    const vatRate = 22.00;
    const vatAmount = Math.round(baseAmount * (vatRate / 100) * 100) / 100;
    const totalAmount = Math.round((baseAmount + vatAmount) * 100) / 100;

    console.log('[WORKOVER-INVOICE] Amounts:', { baseAmount, vatAmount, totalAmount });

    // 7. Generate XML (MOCK for now)
    const xmlContent = generateMockXML({
      invoiceNumber,
      invoiceDate: new Date().toISOString().split('T')[0],
      recipient: host,
      baseAmount,
      vatAmount,
      totalAmount,
      booking: bookingData
    });

    // 8. Upload XML to storage
    const xmlFileName = `${booking_id}/${invoiceNumber}.xml`;
    const { error: uploadXmlError } = await supabaseAdmin.storage
      .from('invoices')
      .upload(xmlFileName, xmlContent, {
        contentType: 'application/xml',
        upsert: true
      });

    if (uploadXmlError) {
      console.error('[WORKOVER-INVOICE] XML upload error:', uploadXmlError);
    }

    const { data: { publicUrl: xmlUrl } } = supabaseAdmin.storage
      .from('invoices')
      .getPublicUrl(xmlFileName);

    // 9. Generate PDF (simplified mock)
    const pdfContent = generateMockPDF({
      invoiceNumber,
      recipient: host,
      baseAmount,
      vatAmount,
      totalAmount
    });

    const pdfFileName = `${booking_id}/${invoiceNumber}.pdf`;
    const { error: uploadPdfError } = await supabaseAdmin.storage
      .from('invoices')
      .upload(pdfFileName, pdfContent, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadPdfError) {
      console.error('[WORKOVER-INVOICE] PDF upload error:', uploadPdfError);
    }

    const { data: { publicUrl: pdfUrl } } = supabaseAdmin.storage
      .from('invoices')
      .getPublicUrl(pdfFileName);

    // 10. Insert invoice record
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        payment_id: paymentData.id,
        booking_id: booking_id,
        recipient_type: recipientType,
        recipient_id: recipientId,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        base_amount: baseAmount,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        xml_file_url: xmlUrl,
        pdf_file_url: pdfUrl,
        xml_delivery_status: 'pending'
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Failed to create invoice: ${invoiceError.message}`);
    }

    // 11. Update payment with invoice ID
    const { error: updatePaymentError } = await supabaseAdmin
      .from('payments')
      .update({
        workover_invoice_id: invoice.id,
        workover_invoice_xml_url: xmlUrl,
        workover_invoice_pdf_url: pdfUrl
      })
      .eq('id', paymentData.id);

    if (updatePaymentError) {
      console.error('[WORKOVER-INVOICE] Payment update error:', updatePaymentError);
    }

    // 12. Send notification to recipient
    await supabaseAdmin
      .from('user_notifications')
      .insert({
        user_id: recipientId,
        type: 'invoice',
        title: 'Fattura WorkOver Disponibile',
        content: `La fattura ${invoiceNumber} per la service fee è disponibile per il download.`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoiceNumber,
          booking_id: booking_id
        }
      });

    console.log('[WORKOVER-INVOICE] Invoice created successfully:', invoiceNumber);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoice_id: invoice.id,
        invoice_number: invoiceNumber 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[WORKOVER-INVOICE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Mock XML generator (placeholder for real SdI provider)
function generateMockXML(data: any): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<FatturaElettronica>
  <Header>
    <Numero>${data.invoiceNumber}</Numero>
    <Data>${data.invoiceDate}</Data>
  </Header>
  <Body>
    <Cedente>WORKOVER SRL</Cedente>
    <Cessionario>${data.recipient.first_name} ${data.recipient.last_name}</Cessionario>
    <Importo>${data.baseAmount}</Importo>
    <IVA>${data.vatAmount}</IVA>
    <Totale>${data.totalAmount}</Totale>
  </Body>
</FatturaElettronica>`;
}

// Mock PDF generator
function generateMockPDF(data: any): string {
  return `FATTURA ELETTRONICA
Numero: ${data.invoiceNumber}
Destinatario: ${data.recipient.first_name} ${data.recipient.last_name}
Base Imponibile: €${data.baseAmount}
IVA 22%: €${data.vatAmount}
TOTALE: €${data.totalAmount}`;
}
