import { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserAIRecords,
  saveAIRecord,
  deleteAIRecord,
} from '../services/aiRecordService';
import type { AIRecord } from '../services/aiRecordService';

export const AIRecords = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AIRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (user) {
      loadRecords();
    }
  }, [user]);

  const loadRecords = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getUserAIRecords(user.id);
      setRecords(data);
    } catch (error) {
      console.error('Error loading AI records:', error);
      alert('Failed to load AI records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: { animalTag: string; aiDate: string }, { resetForm }: any) => {
    if (!user) return;

    try {
      await saveAIRecord(user.id, values.animalTag, values.aiDate);
      alert('AI Record saved successfully!');
      resetForm();
      setShowForm(false);
      loadRecords();
    } catch (error) {
      console.error('Error saving AI record:', error);
      alert('Failed to save AI record');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      await deleteAIRecord(id);
      alert('Record deleted successfully!');
      loadRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading AI records...</p>
      </div>
    );
  }

  return (
    <div className="records-container">
      <div className="records-header">
        <h2>AI Records</h2>
        <button
          className="add-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add Record'}
        </button>
      </div>

      {showForm && (
        <div className="ai-form-container">
          <h3>Add AI Record</h3>
          <Formik
            initialValues={{
              animalTag: '',
              aiDate: new Date().toISOString().split('T')[0],
            }}
            onSubmit={handleSubmit}
          >
            <Form className="ai-form">
              <div className="form-group">
                <label>Animal Tag Number</label>
                <Field
                  name="animalTag"
                  type="text"
                  placeholder="e.g., A001, COW-123"
                  required
                />
              </div>

              <div className="form-group">
                <label>AI Date</label>
                <Field
                  name="aiDate"
                  type="date"
                  required
                />
              </div>

              <button type="submit" className="submit-button">
                Save Record
              </button>
            </Form>
          </Formik>
        </div>
      )}

      <div className="records-list">
        {records.length === 0 ? (
          <div className="empty-state">
            <p>No AI records found</p>
            <p className="empty-hint">Click "Add Record" to create your first entry</p>
          </div>
        ) : (
          <div className="ai-records-grid">
            {records.map((record) => (
              <div key={record.id} className="ai-record-card">
                <div className="record-info">
                  <div className="animal-tag">
                    <span className="label">Animal Tag:</span>
                    <span className="value">{record.animal_tag}</span>
                  </div>
                  <div className="ai-date">
                    <span className="label">AI Date:</span>
                    <span className="value">
                      {new Date(record.ai_date).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  {record.created_at && (
                    <div className="created-date">
                      <span className="label">Recorded on:</span>
                      <span className="value">
                        {new Date(record.created_at).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  className="delete-button"
                  onClick={() => handleDelete(record.id!)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
