import { useState, useRef, useEffect } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useForm } from 'react-hook-form'
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ParsedData>({
    defaultValues: parsedData || {}
  })

  // Update form when parsedData changes
  useEffect(() => {
    if (parsedData) {
      reset(parsedData)
    }
  }, [parsedData, reset])

  const getImageCaptureDate = (file: File): string | null => {
    // Get file's last modified date as fallback
    const fileDate = new Date(file.lastModified)
    const day = String(fileDate.getDate()).padStart(2, '0')
    const month = String(fileDate.getMonth() + 1).padStart(2, '0')
    const year = fileDate.getFullYear()
    return `${day}/${month}/${year}`
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

    // Create image preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Process image with Gemini
    setIsProcessing(true)
    setParsedData(null)

    try {
      const { base64, mimeType } = await convertImageToBase64(file)

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

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Dairy Records</h1>
        <p className="subtitle">Scan & Parse Dairy Receipts</p>
      </header>

      <main className="main-content">
        {!selectedImage ? (
          <div className="upload-section">
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
                        max="5"
                        className="edit-input"
                        {...register('baseRate', {
                          min: { value: 0.1, message: 'Min ₹0.1' },
                          max: { value: 5, message: 'Max ₹5' },
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

            <button className="reset-button" onClick={handleReset}>
              Scan Another Receipt
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
