import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2'
import { USE_CLOUD_STORAGE } from '@/lib/storage-adapter'
import { GetObjectCommand } from '@aws-sdk/client-s3'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    
    if (!key) {
      return new NextResponse('Missing file key', { status: 400 })
    }

    if (USE_CLOUD_STORAGE) {
      const result = await r2Client.send(
        new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
        })
      )
      
      if (!result.Body) {
        return new NextResponse('File not found in cloud', { status: 404 })
      }
      
      const webStream = result.Body.transformToWebStream()
      
      return new NextResponse(webStream, {
        status: 200,
        headers: {
          'Content-Type': result.ContentType || 'application/pdf',
          'Content-Disposition': `inline; filename="${key}"`,
        },
      })
    } else {
      const filePath = path.join(process.cwd(), '.data', 'uploads', key)

      if (!fs.existsSync(filePath)) {
        return new NextResponse('File not found', { status: 404 })
      }

      const fileBuffer = fs.readFileSync(filePath)

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${key}"`,
        },
      })
    }
  } catch (error: any) {
    console.error('Error serving file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
