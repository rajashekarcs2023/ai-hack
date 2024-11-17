import { useState, useEffect } from 'react';
import { Loader2, X } from "lucide-react";
import { Button } from "../../components/ui/button";

export function PastIncidentsModal({ open, onOpenChange }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      fetchPastIncidents();
    }
  }, [open]);

  const fetchPastIncidents = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/past-incidents');
      if (!response.ok) throw new Error('Failed to fetch incidents');
      const data = await response.json();
      setIncidents(data.incidents);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const renderAnalysis = (analysis) => {
    if (!analysis) return 'No analysis available';
    
    return (
      <div className="space-y-3">
        {analysis.vehicleDetails && (
          <div>
            <h5 className="font-medium text-sm">Vehicle Details:</h5>
            <p className="text-sm">{analysis.vehicleDetails}</p>
          </div>
        )}
        
        {analysis.casualties && (
          <div>
            <h5 className="font-medium text-sm">Casualties:</h5>
            <p className="text-sm">{analysis.casualties}</p>
          </div>
        )}
        
        {analysis.hazards && (
          <div>
            <h5 className="font-medium text-sm">Hazards:</h5>
            <p className="text-sm">{analysis.hazards}</p>
          </div>
        )}
        
        {analysis.environment && (
          <div>
            <h5 className="font-medium text-sm">Environment:</h5>
            <p className="text-sm">{analysis.environment}</p>
          </div>
        )}
        
        {analysis.services && (
          <div>
            <h5 className="font-medium text-sm">Services:</h5>
            <p className="text-sm">{analysis.services}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Past Incidents</h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div 
                  key={incident.incident_id} 
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">
                      Incident {incident.incident_id.slice(0, 8)}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {new Date(incident.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-600">Services Dispatched</h4>
                      <div className="flex gap-2 mt-1">
                        {incident.selected_services.police && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Police</span>
                        )}
                        {incident.selected_services.ambulance && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Ambulance</span>
                        )}
                        {incident.selected_services.fire && (
                          <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">Fire Dept</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-600">Notes</h4>
                      <p className="text-sm mt-1">{incident.notes || 'No notes added'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-gray-600">Analysis Report</h4>
                    <div className="mt-1">
                      {renderAnalysis(incident.incident_report.analysis)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}