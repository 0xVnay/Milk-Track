import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getUserReceipts, type Receipt } from '../services/receiptService'
import { format, parse } from 'date-fns'
import './Records.css'

interface GroupedReceipts {
  [key: string]: Receipt[]
}

export const Records = () => {
  const { user } = useAuth()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')

  useEffect(() => {
    if (user) {
      loadReceipts()
    }
  }, [user])

  const loadReceipts = async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await getUserReceipts(user.id)
      setReceipts(data)
    } catch (error) {
      console.error('Error loading receipts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group receipts by month and year
  const groupReceiptsByMonth = (receipts: Receipt[]): GroupedReceipts => {
    const filtered = globalFilter
      ? receipts.filter(r =>
          Object.values(r).some(val =>
            String(val).toLowerCase().includes(globalFilter.toLowerCase())
          )
        )
      : receipts

    return filtered.reduce((groups: GroupedReceipts, receipt) => {
      try {
        // Parse the date (DD/MM/YYYY format)
        const date = parse(receipt.date, 'dd/MM/yyyy', new Date())
        const monthYear = format(date, 'MMMM yyyy')

        if (!groups[monthYear]) {
          groups[monthYear] = []
        }
        groups[monthYear].push(receipt)
      } catch (error) {
        console.error('Error parsing date:', receipt.date, error)
      }
      return groups
    }, {})
  }

  const groupedReceipts = groupReceiptsByMonth(receipts)

  if (loading) {
    return (
      <div className="records-loading">
        <div className="spinner"></div>
        <p>Loading receipts...</p>
      </div>
    )
  }

  return (
    <div className="records-container">
      <div className="records-header">
        <h2>All Records</h2>
        <div className="records-stats">
          <span className="stat-item">
            Total: <strong>{receipts.length}</strong>
          </span>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search records..."
          className="search-input"
        />
      </div>

      {receipts.length === 0 ? (
        <div className="no-records">
          <p>No receipts found</p>
          <p className="no-records-hint">Upload your first receipt to get started!</p>
        </div>
      ) : (
        <div className="month-groups">
          {Object.entries(groupedReceipts).map(([monthYear, monthReceipts]) => (
            <div key={monthYear} className="month-group">
              <h3 className="month-header">{monthYear}</h3>

              <div className="table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Qty</th>
                      <th>Fat</th>
                      <th>SNF</th>
                      <th>Rate</th>
                      <th>Amt</th>
                      <th>CLR</th>
                      <th>F.Kg</th>
                      <th>S.Kg</th>
                      <th>B.Rt</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthReceipts.map((receipt, idx) => {
                      const date = parse(receipt.date, 'dd/MM/yyyy', new Date())
                      const dayOfMonth = format(date, 'dd')

                      // Calculate SNF from CLR and Fat if not provided
                      const snf = receipt.snf_kg
                        ? (parseFloat(receipt.snf_kg) / parseFloat(receipt.quantity) * 100).toFixed(1)
                        : (parseFloat(receipt.clr) - 0.25 * parseFloat(receipt.fat)).toFixed(1)

                      // Determine entry type from image URL
                      const isManualEntry = receipt.image_url.includes('Manual') ||
                                           receipt.image_url.includes('manual')

                      return (
                        <tr key={receipt.id || idx}>
                          <td>{dayOfMonth}</td>
                          <td>{receipt.quantity}</td>
                          <td>{receipt.fat}</td>
                          <td>{snf}</td>
                          <td>{receipt.rate}</td>
                          <td className="amount-cell">{receipt.amount}</td>
                          <td className="extra-col">{receipt.clr}</td>
                          <td className="extra-col">{receipt.fat_kg || '-'}</td>
                          <td className="extra-col">{receipt.snf_kg || '-'}</td>
                          <td className="extra-col">{receipt.base_rate}</td>
                          <td className="extra-col">
                            <a
                              href={receipt.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="entry-type-link"
                              title={isManualEntry ? 'Manual Entry' : 'Camera Upload'}
                            >
                              {isManualEntry ? '✍️' : '📷'}
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td colSpan={5} className="totals-label">Total</td>
                      <td className="totals-value">
                        {monthReceipts.reduce((sum, r) => sum + parseFloat(r.amount), 0).toFixed(2)}
                      </td>
                      <td colSpan={5}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
