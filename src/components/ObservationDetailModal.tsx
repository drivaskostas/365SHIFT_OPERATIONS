
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, User, Clock, FileText, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface PatrolObservation {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  timestamp: string;
  guard_name: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
  notes?: any;
}

interface ObservationDetailModalProps {
  observation: PatrolObservation | null;
  isOpen: boolean;
  onClose: () => void;
}

const ObservationDetailModal = ({ observation, isOpen, onClose }: ObservationDetailModalProps) => {
  const { t } = useLanguage();

  if (!observation) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityText = (severity: string) => {
    return t(`severity.${severity}`) || severity;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'resolved':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderNotes = (notes: any) => {
    if (!notes) return null;
    
    let notesArray = [];
    if (Array.isArray(notes)) {
      notesArray = notes;
    } else if (typeof notes === 'object' && notes !== null) {
      notesArray = Object.values(notes).filter(note => {
        if (typeof note === 'string') return note;
        if (typeof note === 'object' && note !== null && 'text' in note) return note;
        return false;
      });
    } else if (typeof notes === 'string' && notes.trim()) {
      notesArray = [notes];
    }

    if (notesArray.length === 0) return null;

    return (
      <div className="mt-6">
        <div className="flex items-center space-x-2 mb-3">
          <FileText className="h-5 w-5 text-gray-500" />
          <span className="text-lg font-medium text-gray-900 dark:text-white">Notes:</span>
        </div>
        <div className="space-y-3">
          {notesArray.map((note, index) => {
            let noteText = '';
            let noteAuthor = '';
            let noteTimestamp = '';
            
            if (typeof note === 'string') {
              noteText = note;
            } else if (typeof note === 'object' && note !== null) {
              const noteObj = note as Record<string, any>;
              noteText = noteObj.text || '';
              noteAuthor = noteObj.author || '';
              noteTimestamp = noteObj.timestamp || '';
            }
            
            if (!noteText.trim()) return null;
            
            return (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-900 dark:text-white mb-2">{noteText}</p>
                {(noteAuthor || noteTimestamp) && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-4">
                    {noteAuthor && <span>By: {noteAuthor}</span>}
                    {noteTimestamp && <span>At: {new Date(noteTimestamp).toLocaleString()}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold pr-8">{observation.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status and Severity Badges */}
          <div className="flex flex-wrap gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(observation.severity)}`}>
              {getSeverityText(observation.severity)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(observation.status)}`}>
              {observation.status.charAt(0).toUpperCase() + observation.status.slice(1)}
            </span>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Guard:</strong> {observation.guard_name || 'Unknown Guard'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Time:</strong> {new Date(observation.timestamp).toLocaleString()}
              </span>
            </div>
            {observation.latitude && observation.longitude && (
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Location:</strong> {observation.latitude.toFixed(6)}, {observation.longitude.toFixed(6)}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {observation.description && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{observation.description}</p>
            </div>
          )}

          {/* Image */}
          {observation.image_url && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Evidence</h3>
              <img
                src={observation.image_url}
                alt="Observation evidence"
                className="w-full max-w-md rounded-lg shadow-lg"
              />
            </div>
          )}

          {/* Notes */}
          {renderNotes(observation.notes)}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ObservationDetailModal;
