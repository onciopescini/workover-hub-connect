
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImageProcessingRequest {
  filePath: string;
  spaceId?: string;
  originalSize?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { filePath, spaceId, originalSize }: ImageProcessingRequest = await req.json()

    console.log('Processing image:', { filePath, spaceId, originalSize })

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid authorization')
    }

    // Create processing job
    const { data: jobData, error: jobError } = await supabaseClient.rpc(
      'create_image_processing_job',
      {
        space_id_param: spaceId,
        original_path_param: filePath,
        original_size_param: originalSize
      }
    )

    if (jobError) {
      throw new Error(`Failed to create processing job: ${jobError.message}`)
    }

    const jobId = jobData

    // Start background processing
    EdgeRuntime.waitUntil(processImageAsync(supabaseClient, jobId, filePath, user.id))

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId,
        message: 'Image processing started' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Image optimization error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function processImageAsync(
  supabaseClient: any,
  jobId: string,
  filePath: string,
  userId: string
) {
  try {
    console.log('Starting async image processing for job:', jobId)

    // Update job status to processing
    await supabaseClient.rpc('update_image_processing_job', {
      job_id_param: jobId,
      status_param: 'processing'
    })

    // Download original image
    const { data: imageData, error: downloadError } = await supabaseClient.storage
      .from('space_photos')
      .download(filePath)

    if (downloadError) {
      throw new Error(`Failed to download image: ${downloadError.message}`)
    }

    // Convert image data to ArrayBuffer
    const imageBuffer = await imageData.arrayBuffer()
    const originalSize = imageBuffer.byteLength

    // Process image with WebP conversion and compression
    const optimizedBuffer = await convertToWebP(imageBuffer)
    const optimizedSize = optimizedBuffer.byteLength

    // Generate optimized file path
    const pathParts = filePath.split('.')
    const optimizedPath = `${pathParts.slice(0, -1).join('.')}.optimized.webp`

    // Upload optimized image
    const { error: uploadError } = await supabaseClient.storage
      .from('space_photos')
      .upload(optimizedPath, optimizedBuffer, {
        contentType: 'image/webp',
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Failed to upload optimized image: ${uploadError.message}`)
    }

    // Calculate compression ratio
    const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100)

    // Update job as completed
    await supabaseClient.rpc('update_image_processing_job', {
      job_id_param: jobId,
      status_param: 'completed',
      optimized_path_param: optimizedPath,
      optimized_size_param: optimizedSize,
      compression_ratio_param: compressionRatio
    })

    console.log('Image processing completed:', {
      jobId,
      originalSize,
      optimizedSize,
      compressionRatio: `${compressionRatio.toFixed(2)}%`
    })

  } catch (error) {
    console.error('Background image processing failed:', error)
    
    // Update job as failed
    await supabaseClient.rpc('update_image_processing_job', {
      job_id_param: jobId,
      status_param: 'failed',
      error_message_param: error.message
    })
  }
}

async function convertToWebP(imageBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    // Use ImageScript for WebP conversion
    const { Image } = await import('https://deno.land/x/imagescript@1.2.15/mod.ts')
    
    // Decode the image
    const image = await Image.decode(new Uint8Array(imageBuffer))
    
    // Resize if too large (max 1920px width, maintain aspect ratio)
    const maxWidth = 1920
    if (image.width > maxWidth) {
      const aspectRatio = image.height / image.width
      const newHeight = Math.round(maxWidth * aspectRatio)
      image.resize(maxWidth, newHeight)
    }
    
    // Encode to WebP with quality setting
    const webpBuffer = await image.encodeWebP(85) // 85% quality for good balance
    
    return webpBuffer.buffer
  } catch (error) {
    console.error('WebP conversion failed:', error)
    throw new Error(`Image conversion failed: ${error.message}`)
  }
}
