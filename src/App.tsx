import { useState, useRef, useEffect } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useForm } from 'react-hook-form'
import { useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { Records } from './components/Records'
import { saveReceipt } from './services/receiptService'
import './App.css'

interface ParsedData {
  rawText: string
  date?: string
  quantity?: string
  fat?: string
  clr?: string
  fatKg?: string
  snfKg?: string
  baseRate?: string
  rate?: string
  amount?: string
}


function App() {
  const { user, loading: authLoading, logout } = useAuth()
  const [currentView, setCurrentView] = useState<'upload' | 'records'>('upload')
  const [entryMode, setEntryMode] = useState<'camera' | 'manual'>('camera')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset } = useForm<ParsedData>({
    defaultValues: parsedData || {}
  })

  // Update form when parsedData changes
  useEffect(() => {
    if (parsedData) {
      reset(parsedData)
    }
  }, [parsedData, reset])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />
  }

  const getImageCaptureDate = (file: File): string | null => {
    // Get file's last modified date as fallback
    const fileDate = new Date(file.lastModified)
    const day = String(fileDate.getDate()).padStart(2, '0')
    const month = String(fileDate.getMonth() + 1).padStart(2, '0')
    const year = fileDate.getFullYear()
    return `${day}/${month}/${year}`
  }

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          // Calculate new dimensions (max 1600px width/height while maintaining aspect ratio)
          let width = img.width
          let height = img.height
          const maxSize = 1600

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          } else if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }

          canvas.width = width
          canvas.height = height

          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob)
              else reject(new Error('Compression failed'))
            },
            'image/jpeg',
            0.85 // 85% quality - good balance between quality and size
          )
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const convertImageToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        const base64 = result.split(',')[1]
        resolve({ base64, mimeType: file.type })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      alert('Please add your Gemini API key to .env.local file:\nVITE_GEMINI_API_KEY=your_api_key_here\n\nGet your free API key from: https://makersuite.google.com/app/apikey\n\nThen restart the dev server.')
      return
    }

    // Process image with Gemini
    setIsProcessing(true)
    setParsedData(null)

    try {
      // Compress image first
      const compressed = await compressImage(file)
      console.log(`Original size: ${(file.size / 1024).toFixed(2)}KB, Compressed size: ${(compressed.size / 1024).toFixed(2)}KB`)

      // Store compressed blob for later save
      setCompressedBlob(compressed)

      // Create image preview from compressed blob
      const previewUrl = URL.createObjectURL(compressed)
      setSelectedImage(previewUrl)

      // Convert compressed blob to base64 for Gemini API
      const compressedFile = new File([compressed], file.name, { type: 'image/jpeg' })
      const { base64, mimeType } = await convertImageToBase64(compressedFile)

      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

      const prompt = `Please analyze this dairy receipt/slip image and extract the following information in JSON format.

IMPORTANT: In the upper section of the receipt, the top 4 items are usually:
1. QTY (Quantity in liters)
2. FAT (Fat percentage)
3. CLR (Corrected Lactometer Reading value)
4. RATE (Base rate - this is usually shown in PAISE, NOT rupees. This is NOT the final rate)

The "Avg. Rate" shown below these 4 items is the ACTUAL calculated rate that should be used.

Extract these fields:
{
  "date": "date in DD/MM/YYYY format",
  "quantity": "quantity in liters from QTY field (just the number)",
  "fat": "fat percentage from FAT field (just the number)",
  "clr": "CLR value (just the number)",
  "fatKg": "fat in kg if shown (just the number)",
  "snfKg": "SNF in kg if shown (just the number)",
  "baseRate": "the base RATE from the top section in PAISE (just the number, e.g., if it shows 70.50, return 70.50)",
  "rate": "the Avg. Rate or calculated rate shown below (just the number)",
  "amount": "total amount in rupees (just the number)"
}

Only include fields that are clearly visible in the image. Return ONLY the JSON object, no additional text.`

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64,
            mimeType: mimeType
          }
        }
      ])

      const response = result.response
      const responseText = response.text()
      console.log('Gemini Response:', responseText)

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[0])

        // Get image capture date as fallback
        const captureDate = getImageCaptureDate(file)

        setParsedData({
          rawText: responseText,
          date: extractedData.date || captureDate, // Use capture date if not found in receipt
          ...extractedData
        })
      } else {
        throw new Error('Could not parse response from Gemini')
      }
    } catch (error) {
      console.error('Processing Error:', error)
      alert('Failed to process image. Please check your API key and try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    setSelectedImage(null)
    setCompressedBlob(null)
    setParsedData(null)
    setIsEditing(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCameraClick = () => {
    fileInputRef.current?.click()
  }

  const onSubmit = (data: ParsedData) => {
    setParsedData({ ...parsedData!, ...data })
    setIsEditing(false)
  }

  const handleSaveReceipt = async () => {
    if (!user || !parsedData) return

    // For manual entry, we need to create a dummy image blob
    if (entryMode === 'manual' && !compressedBlob) {
      setIsSaving(true)
      try {
        // Create a simple canvas with the receipt data as text
        const canvas = document.createElement('canvas')
        canvas.width = 400
        canvas.height = 300
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, 400, 300)
          ctx.fillStyle = 'black'
          ctx.font = '16px Arial'
          ctx.fillText('Manual Entry', 150, 50)
          ctx.fillText(`Date: ${parsedData.date}`, 50, 100)
          ctx.fillText(`Qty: ${parsedData.quantity}`, 50, 130)
          ctx.fillText(`Fat: ${parsedData.fat}%`, 50, 160)
          ctx.fillText(`Rate: ${parsedData.rate}`, 50, 190)
          ctx.fillText(`Amount: ${parsedData.amount}`, 50, 220)
        }

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8)
        })

        const receiptData = {
          date: parsedData.date || '',
          quantity: parsedData.quantity || '',
          fat: parsedData.fat || '',
          clr: parsedData.clr || '',
          fat_kg: parsedData.fatKg,
          snf_kg: parsedData.snfKg,
          base_rate: parsedData.baseRate || '',
          rate: parsedData.rate || '',
          amount: parsedData.amount || '',
          image_url: ''
        }

        await saveReceipt(user.id, receiptData, blob)
        alert('Receipt saved successfully!')
        handleReset()
      } catch (error) {
        console.error('Error saving receipt:', error)
        alert('Failed to save receipt. Please try again.')
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (!compressedBlob) return

    setIsSaving(true)
    try {
      const receiptData = {
        date: parsedData.date || '',
        quantity: parsedData.quantity || '',
        fat: parsedData.fat || '',
        clr: parsedData.clr || '',
        fat_kg: parsedData.fatKg,
        snf_kg: parsedData.snfKg,
        base_rate: parsedData.baseRate || '',
        rate: parsedData.rate || '',
        amount: parsedData.amount || '',
        image_url: '' // Will be filled by saveReceipt
      }

      await saveReceipt(user.id, receiptData, compressedBlob)
      alert('Receipt saved successfully!')
      handleReset()
    } catch (error) {
      console.error('Error saving receipt:', error)
      alert('Failed to save receipt. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>India Delightt</h1>
            <p className="subtitle">Track Your Dairy Receipts</p>
            {user && (
              <p className="user-info">
                {user.user_metadata?.full_name || user.email}
              </p>
            )}
          </div>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${currentView === 'upload' ? 'active' : ''}`}
            onClick={() => setCurrentView('upload')}
          >
            Upload Receipt
          </button>
          <button
            className={`nav-tab ${currentView === 'records' ? 'active' : ''}`}
            onClick={() => setCurrentView('records')}
          >
            View Records
          </button>
        </nav>
      </header>

      <main className="main-content">
        {currentView === 'records' ? (
          <Records />
        ) : (
          <>
            {!selectedImage && !parsedData ? (
              <div className="upload-section">
                <div className="entry-mode-toggle">
                  <button
                    className={`mode-button ${entryMode === 'camera' ? 'active' : ''}`}
                    onClick={() => setEntryMode('camera')}
                  >
                    📷 Camera
                  </button>
                  <button
                    className={`mode-button ${entryMode === 'manual' ? 'active' : ''}`}
                    onClick={() => setEntryMode('manual')}
                  >
                    ✍️ Manual
                  </button>
                </div>

                {entryMode === 'camera' ? (
                  <>
                    <div className="upload-icon" onClick={handleCameraClick}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <p>Tap to capture or upload</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="file-input"
                    />
                  </>
                ) : (
                  <div className="manual-entry-form">
                    <h3>Manual Entry</h3>
                    <form onSubmit={handleSubmit((data) => {
                      // Calculate CLR from SNF if SNF is provided
                      const snfValue = data.snfKg || '0'
                      const fatValue = data.fat || '0'
                      const clr = (parseFloat(snfValue) + 0.25 * parseFloat(fatValue)).toFixed(2)

                      // Convert date from YYYY-MM-DD to DD/MM/YYYY
                      let formattedDate = data.date
                      if (data.date && data.date.includes('-')) {
                        const [year, month, day] = data.date.split('-')
                        formattedDate = `${day}/${month}/${year}`
                      }

                      setParsedData({
                        rawText: 'Manual entry',
                        date: formattedDate,
                        quantity: data.quantity,
                        fat: data.fat,
                        snfKg: data.snfKg,
                        clr: clr,
                        rate: data.rate,
                        amount: data.amount
                      })
                    })}>
                      <div className="form-group">
                        <label>Date</label>
                        <input
                          type="date"
                          className="date-input"
                          defaultValue={new Date().toISOString().split('T')[0]}
                          {...register('date', { required: true })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Quantity (Liters)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          {...register('quantity', { required: true })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Fat %</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          {...register('fat', { required: true })}
                        />
                      </div>

                      <div className="form-group">
                        <label>SNF %</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          {...register('snfKg', { required: true })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Rate</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          {...register('rate', { required: true })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Amount</label>
                        <input
                          type="number"
                          step="1"
                          placeholder="0"
                          {...register('amount', { required: true })}
                        />
                      </div>

                      <button type="submit" className="submit-button">
                        Continue
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="preview-section">
                {isProcessing && (
                  <div className="processing-indicator">
                    <div className="spinner"></div>
                    <p>Analyzing image with Gemini AI...</p>
                  </div>
                )}

                {parsedData && !isProcessing && (
                  <form className="parsed-data" onSubmit={handleSubmit(onSubmit)}>
                <div className="header-section">
                  <h2>Extracted Data</h2>
                  {!isEditing ? (
                    <button
                      type="button"
                      className="edit-button"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="edit-button"
                    >
                      Save
                    </button>
                  )}
                </div>

                <div className="data-grid">
                  <div className="data-item">
                    <span className="label">Date</span>
                    {isEditing ? (
                      <input
                        type="text"
                        className="edit-input"
                        {...register('date', {
                          pattern: {
                            value: /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/\d{4}$/,
                            message: 'Use DD/MM/YYYY format'
                          }
                        })}
                        placeholder="DD/MM/YYYY"
                      />
                    ) : (
                      <span className="value">{parsedData.date || '-'}</span>
                    )}
                  </div>

                  <div className="data-item">
                    <span className="label">Quantity (Ltr)</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="500"
                        className="edit-input"
                        {...register('quantity', {
                          min: { value: 0.1, message: 'Min 0.1' },
                          max: { value: 500, message: 'Max 500' },
                          valueAsNumber: false
                        })}
                        placeholder="0.0"
                      />
                    ) : (
                      <span className="value">{parsedData.quantity ? `${parsedData.quantity} Ltr` : '-'}</span>
                    )}
                  </div>

                  <div className="data-item">
                    <span className="label">Fat %</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        min="2"
                        max="11"
                        className="edit-input"
                        {...register('fat', {
                          min: { value: 2, message: 'Min 2%' },
                          max: { value: 11, message: 'Max 11%' },
                          valueAsNumber: false
                        })}
                        placeholder="0.0"
                      />
                    ) : (
                      <span className="value">{parsedData.fat ? `${parsedData.fat}%` : '-'}</span>
                    )}
                  </div>

                  <div className="data-item">
                    <span className="label">CLR</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        min="15"
                        max="40"
                        className="edit-input"
                        {...register('clr', {
                          min: { value: 15, message: 'Min 15' },
                          max: { value: 40, message: 'Max 40' },
                          valueAsNumber: false
                        })}
                        placeholder="0.0"
                      />
                    ) : (
                      <span className="value">{parsedData.clr || '-'}</span>
                    )}
                  </div>

                  <div className="data-item">
                    <span className="label">Fat Kg</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="50"
                        className="edit-input"
                        {...register('fatKg', {
                          min: { value: 0.01, message: 'Min 0.01' },
                          max: { value: 50, message: 'Max 50' },
                          valueAsNumber: false
                        })}
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="value">{parsedData.fatKg ? `${parsedData.fatKg} kg` : '-'}</span>
                    )}
                  </div>

                  <div className="data-item">
                    <span className="label">SNF Kg</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="50"
                        className="edit-input"
                        {...register('snfKg', {
                          min: { value: 0.01, message: 'Min 0.01' },
                          max: { value: 50, message: 'Max 50' },
                          valueAsNumber: false
                        })}
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="value">{parsedData.snfKg ? `${parsedData.snfKg} kg` : '-'}</span>
                    )}
                  </div>

                  <div className="data-item">
                    <span className="label">Base Rate</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        max="100"
                        className="edit-input"
                        {...register('baseRate', {
                          min: { value: 0.1, message: 'Min ₹0.1' },
                          max: { value: 100, message: 'Max ₹100' },
                          valueAsNumber: false
                        })}
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="value">{parsedData.baseRate ? `₹${(parseFloat(parsedData.baseRate) / 100).toFixed(2)}` : '-'}</span>
                    )}
                  </div>

                  <div className="data-item">
                    <span className="label">Avg. Rate</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="200"
                        className="edit-input"
                        {...register('rate', {
                          min: { value: 1, message: 'Min ₹1' },
                          max: { value: 200, message: 'Max ₹200' },
                          valueAsNumber: false
                        })}
                        placeholder="0.0"
                      />
                    ) : (
                      <span className="value">{parsedData.rate ? `₹${parsedData.rate}` : '-'}</span>
                    )}
                  </div>

                  <div className="data-item highlight">
                    <span className="label">Total Amount</span>
                    {isEditing ? (
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="100000"
                        className="edit-input"
                        {...register('amount', {
                          min: { value: 1, message: 'Min ₹1' },
                          max: { value: 100000, message: 'Max ₹100k' },
                          valueAsNumber: false
                        })}
                        placeholder="0.0"
                      />
                    ) : (
                      <span className="value">{parsedData.amount ? `₹${parsedData.amount}` : '-'}</span>
                    )}
                  </div>
                </div>
                  </form>
                )}

                {parsedData && !isProcessing && (
                  <div className="action-buttons">
                    <button
                      className="save-button"
                      onClick={handleSaveReceipt}
                      disabled={isSaving || isEditing}
                    >
                      {isSaving ? 'Saving...' : 'Save Receipt'}
                    </button>
                    <button className="reset-button" onClick={handleReset} disabled={isSaving}>
                      Scan Another
                    </button>
                  </div>
                )}

                {!parsedData && selectedImage && !isProcessing && (
                  <button className="reset-button" onClick={handleReset}>
                    Scan Another Receipt
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
