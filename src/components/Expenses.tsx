import { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  getUserExpenses,
  saveExpense,
  deleteExpense,
} from '../services/expenseService';
import type { Expense } from '../services/expenseService';

export const Expenses = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    if (user && currentOrganization) {
      loadExpenses();
    }
  }, [user, currentOrganization]);

  const loadExpenses = async () => {
    if (!user || !currentOrganization) return;

    try {
      setLoading(true);
      const data = await getUserExpenses(currentOrganization.id);
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
      alert('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (
    values: {
      expenseName: string;
      expenseDate: string;
      quantity: string;
      rate: string;
      amount: string;
      details: string;
    },
    { resetForm }: any
  ) => {
    if (!user || !currentOrganization) return;

    try {
      await saveExpense(
        user.id,
        currentOrganization.id,
        values.expenseName,
        values.expenseDate,
        values.amount,
        values.quantity || undefined,
        values.rate || undefined,
        values.details || undefined
      );
      alert('Expense saved successfully!');
      resetForm();
      setShowForm(false);
      loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await deleteExpense(id);
      alert('Expense deleted successfully!');
      loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };

  // Calculate amount based on quantity and rate
  const calculateAmount = (quantity: string, rate: string): string => {
    const qty = parseFloat(quantity) || 0;
    const rt = parseFloat(rate) || 0;
    return (qty * rt).toFixed(2);
  };

  // Format date to DD/MM
  const formatShortDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading expenses...</p>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="empty-state">
        <p>No organization selected</p>
        <p className="empty-hint">Please select or create an organization first</p>
      </div>
    );
  }

  return (
    <div className="records-container">
      <div className="records-header">
        <h2>Expenses</h2>
        <button
          className="add-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add Expense'}
        </button>
      </div>

      {showForm && (
        <div className="ai-form-container">
          <h3>Add Expense</h3>
          <Formik
            initialValues={{
              expenseName: '',
              expenseDate: new Date().toISOString().split('T')[0],
              quantity: '',
              rate: '',
              amount: '',
              details: '',
            }}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue }) => (
              <Form className="ai-form">
                <div className="form-group">
                  <label>Expense Name</label>
                  <Field
                    name="expenseName"
                    type="text"
                    placeholder="e.g., Feed, Medicine, Equipment"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Date</label>
                  <Field
                    name="expenseDate"
                    type="date"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Quantity (Optional)</label>
                  <Field
                    name="quantity"
                    type="number"
                    step="any"
                    placeholder="0"
                    onChange={(e: any) => {
                      setFieldValue('quantity', e.target.value);
                      if (values.rate) {
                        setFieldValue('amount', calculateAmount(e.target.value, values.rate));
                      }
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Rate (Optional)</label>
                  <Field
                    name="rate"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    onChange={(e: any) => {
                      setFieldValue('rate', e.target.value);
                      if (values.quantity) {
                        setFieldValue('amount', calculateAmount(values.quantity, e.target.value));
                      }
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Amount</label>
                  <Field
                    name="amount"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Details (Optional)</label>
                  <Field
                    name="details"
                    as="textarea"
                    placeholder="Any additional details..."
                    rows={3}
                  />
                </div>

                <button type="submit" className="submit-button">
                  Save Expense
                </button>
              </Form>
            )}
          </Formik>
        </div>
      )}

      <div className="records-list">
        {expenses.length === 0 ? (
          <div className="empty-state">
            <p>No expenses found</p>
            <p className="empty-hint">Click "Add Expense" to create your first entry</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Date</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>Details</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <>
                    <tr key={expense.id}>
                      <td>{expense.expense_name}</td>
                      <td>{formatShortDate(expense.expense_date)}</td>
                      <td>{expense.quantity || '-'}</td>
                      <td>{expense.rate ? `₹${expense.rate}` : '-'}</td>
                      <td style={{ fontWeight: 700, color: '#764ba2' }}>₹{expense.amount}</td>
                      <td>
                        {expense.details ? (
                          <button
                            className="details-toggle"
                            onClick={() => toggleRow(expense.id!)}
                          >
                            {expandedRow === expense.id ? '▼' : '▶'}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <button
                          className="delete-button-small"
                          onClick={() => handleDelete(expense.id!)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {expandedRow === expense.id && expense.details && (
                      <tr className="details-row">
                        <td colSpan={7}>
                          <div className="details-content">
                            {expense.details}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
