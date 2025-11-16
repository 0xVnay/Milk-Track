import { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserDewormingRecords,
  saveDewormingRecord,
  deleteDewormingRecord,
} from '../services/dewormingRecordService';
import type { DewormingRecord } from '../services/dewormingRecordService';

export const DewormingRecords = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DewormingRecord[]>([]);
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
      const data = await getUserDewormingRecords(user.id);
      setRecords(data);
    } catch (error) {
      console.error('Error loading deworming records:', error);
      alert('Failed to load deworming records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (
    values: { animalTag: string; dewormingDate: string; medicineName: string; notes: string },
    { resetForm }: any
  ) => {
    if (!user) return;

    try {
      await saveDewormingRecord(
        user.id,
        values.animalTag,
        values.dewormingDate,
        values.medicineName || undefined,
        values.notes || undefined
      );
      alert('Deworming record saved successfully!');
      resetForm();
      setShowForm(false);
      loadRecords();
    } catch (error) {
      console.error('Error saving deworming record:', error);
      alert('Failed to save deworming record');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      await deleteDewormingRecord(id);
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
        <p>Loading deworming records...</p>
      </div>
    );
  }

  return (
    <div className="records-container">
      <div className="records-header">
        <h2>Deworming Records</h2>
        <button
          className="add-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add Record'}
        </button>
      </div>

      {showForm && (
        <div className="ai-form-container">
          <h3>Add Deworming Record</h3>
          <Formik
            initialValues={{
              animalTag: '',
              dewormingDate: new Date().toISOString().split('T')[0],
              medicineName: '',
              notes: '',
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
                <label>Deworming Date</label>
                <Field
                  name="dewormingDate"
                  type="date"
                  required
                />
              </div>

              <div className="form-group">
                <label>Medicine Name (Optional)</label>
                <Field
                  name="medicineName"
                  type="text"
                  placeholder="e.g., Ivermectin, Albendazole"
                />
              </div>

              <div className="form-group full-width">
                <label>Notes (Optional)</label>
                <Field
                  name="notes"
                  as="textarea"
                  placeholder="Any additional notes..."
                  rows={3}
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
            <p>No deworming records found</p>
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
                    <span className="label">Deworming Date:</span>
                    <span className="value">
                      {new Date(record.deworming_date).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  {record.medicine_name && (
                    <div className="medicine-info">
                      <span className="label">Medicine:</span>
                      <span className="value">{record.medicine_name}</span>
                    </div>
                  )}
                  {record.notes && (
                    <div className="notes-info">
                      <span className="label">Notes:</span>
                      <span className="value">{record.notes}</span>
                    </div>
                  )}
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
