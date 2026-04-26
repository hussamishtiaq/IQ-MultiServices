'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2 } from 'lucide-react'

interface ImageUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
}

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setUploading(true)
    setError(null)
    const uploaded: string[] = []

    for (const file of files) {
      const body = new FormData()
      body.append('file', file)
      body.append('upload_preset', UPLOAD_PRESET)
      body.append('folder', 'iq-multiservices/properties')

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body }
      )

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(`Upload failed: ${json?.error?.message ?? res.statusText}`)
        continue
      }

      const json = await res.json()
      uploaded.push(json.secure_url as string)
    }

    setUploading(false)
    onChange([...value, ...uploaded])
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (url: string) => onChange(value.filter(u => u !== url))

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map(url => (
            <div key={url} className="relative w-24 h-20 rounded-xl overflow-hidden border border-slate-200 group">
              <Image src={url} alt="Property image" fill className="object-cover" sizes="96px" />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-6 cursor-pointer transition-colors ${
        uploading
          ? 'bg-slate-50 border-slate-200 cursor-not-allowed'
          : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50'
      }`}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
          disabled={uploading}
        />
        {uploading ? (
          <>
            <Loader2 size={18} className="animate-spin text-emerald-600" />
            <span className="text-sm text-slate-500">Uploading to Cloudinary…</span>
          </>
        ) : (
          <>
            <Upload size={18} className="text-slate-400" />
            <span className="text-sm text-slate-500">
              Click to upload images <span className="text-xs text-slate-400">(PNG, JPG, WebP)</span>
            </span>
          </>
        )}
      </label>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
      )}
    </div>
  )
}
