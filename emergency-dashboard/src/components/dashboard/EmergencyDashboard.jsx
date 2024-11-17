import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Phone, 
  Ambulance, 
  FireExtinguisher, 
  Shield, 
  X, 
  Check, 
  Map, 
  Images, 
  Clock,
  Upload,
  Loader2,
  Download,
  Car, 
  UserRound, 
  AlertTriangle, 
  Cloud, 
  Siren,
  Save,
  Bell,
  History 
} from 'lucide-react';

const EmergencyDashboard = () => {
  // Service selection states
  const [selectedServices, setSelectedServices] = useState({
    police: false,
    ambulance: false,
    fire: false
  });

  // UI states
  const [showMap, setShowMap] = useState(false);
  const [leftWidth, setLeftWidth] = useState(60);
  const [rightWidth, setRightWidth] = useState(40);
  
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadError, setUploadError] = useState(null);
  
  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState(null);
  const [processedFrames, setProcessedFrames] = useState([]);
  const [incidentReport, setIncidentReport] = useState(null);
  const [analysisKeywords, setAnalysisKeywords] = useState([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
const [notes, setNotes] = useState('');
const [isSaving, setIsSaving] = useState(false); 
const [incidentHistory, setIncidentHistory] = useState([]);
const [notifications, setNotifications] = useState(3);

  // Refs for resize functionality
  const resizeRef = useRef(null);
  const isDraggingRef = useRef(false);

  const handleSaveNotes = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('http://localhost:8000/api/save-incident', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incidentReport: incidentReport,
          selectedServices: selectedServices,
          notes: notes,
          timestamp: new Date().toISOString(),
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to save incident details');
      }
  
      alert('Incident details saved successfully');
      setNotes('');
      setIsConfirmed(false);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save incident details');
    } finally {
      setIsSaving(false);
    }
  };

  // Video upload handler
  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('File size exceeds 100MB limit');
      return;
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/avi', 'video/mov'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload MP4, AVI, or MOV');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Get upload URL from backend
      const response = await fetch('http://localhost:8000/api/get-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type
        })
      });

      if (!response.ok) throw new Error('Failed to get upload URL');

      const { uploadUrl, videoKey } = await response.json();

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload file');

      setVideoUrl(`https://your-bucket.s3.region.amazonaws.com/${videoKey}`);
      setUploadProgress(100);
      
      // Process the video
      await processVideo(videoKey);

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error.message || 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };
// Video processing handler
const processVideo = async (videoKey) => {
  setIsProcessing(true);
  setProcessError(null);

  try {
    const response = await fetch('http://localhost:8000/api/process-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoKey })
    });

    if (!response.ok) throw new Error('Failed to process video');

    const result = await response.json();
    console.log('Raw API response:', result); // Add this debug log
    
    if (result.status === 'success') {
      // Update frames with base64 images
      setProcessedFrames(result.frames.map(frame => ({
        id: frame.id,
        src: `data:image/jpeg;base64,${frame.image}`,
        timestamp: frame.timestamp
      })));

      // Update incident report with the analysis
      setIncidentReport({
        analysis: result.analysis
      });
      
      console.log('Setting incident report with:', result.analysis); // Add this debug log

      // Update emergency services based on keywords
      if (result.keywords) {
        setAnalysisKeywords(result.keywords);
        setSelectedServices({
          police: result.keywords.includes('Vehicle Collision'),
          ambulance: result.keywords.includes('Injuries') || result.keywords.includes('Critical Condition'),
          fire: result.keywords.includes('Fire Hazard') || result.keywords.includes('Fuel Leak')
        });
      }
    } else {
      throw new Error(result.error || 'Processing failed');
    }
  } catch (error) {
    console.error('Processing failed:', error);
    setProcessError(error.message || 'Failed to process video');
  } finally {
    setIsProcessing(false);
  }
};

// Upload progress simulation
useEffect(() => {
  let progressInterval;
  if (isUploading && uploadProgress < 90) {
    progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 500);
  }
  return () => clearInterval(progressInterval);
}, [isUploading, uploadProgress]);

// Resize handlers
const handleMouseDown = (e) => {
  e.preventDefault();
  isDraggingRef.current = true;
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

const handleMouseMove = (e) => {
  if (!isDraggingRef.current) return;
  const containerWidth = window.innerWidth;
  const newPosition = (e.clientX / containerWidth) * 100;
  const newLeftWidth = Math.max(20, Math.min(80, newPosition));
  const newRightWidth = 100 - newLeftWidth;
  setLeftWidth(newLeftWidth);
  setRightWidth(newRightWidth);
};

const handleMouseUp = () => {
  isDraggingRef.current = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
};

// Helper function to handle export
const handleExport = () => {
  // TODO: Implement PDF export
  console.log('Export functionality to be implemented');
};

// Helper function to determine button color based on service type
const getServiceButtonColor = (service, isSelected) => {
  if (!isSelected) return '';
  
  switch(service) {
    case 'police':
      return 'bg-blue-600 hover:bg-blue-700';
    case 'ambulance':
      return 'bg-red-500 hover:bg-red-600';
    case 'fire':
      return 'bg-orange-500 hover:bg-orange-600';
    default:
      return 'bg-green-600 hover:bg-green-700';
  }
};
console.log('Analysis structure:', {
  vehicleDetails: incidentReport?.analysis?.vehicleDetails,
  casualties: incidentReport?.analysis?.casualties,
  hazards: incidentReport?.analysis?.hazards,
  environment: incidentReport?.analysis?.environment,
  services: incidentReport?.analysis?.services
});

console.log('Raw report:', incidentReport);
return (
  <div className="min-h-screen bg-gray-50">
    {/* Header */}
    <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
  <div className="max-w-[2000px] mx-auto px-4 py-3 flex justify-between items-center">
    <h1 className="text-2xl font-bold">Emergency Incident Dashboard</h1>
    <div className="flex items-center gap-3">
      {/* Past Incidents Button */}
      <Button 
        variant="outline"
        onClick={() => {/* TODO: Handle past incidents */}}
        className="flex items-center gap-2"
      >
        <History className="h-5 w-5" />
        Past Incidents
      </Button>

      {/* Map/Frames Toggle Button */}
      <Button 
        variant="outline"
        onClick={() => setShowMap(!showMap)}
        className="flex items-center gap-2"
      >
        {showMap ? <Images className="h-5 w-5" /> : <Map className="h-5 w-5" />}
        {showMap ? 'Show Frames' : 'Show Map'}
      </Button>

      {/* Notifications Button */}
      <Button 
        variant="outline" 
        className="relative"
        onClick={() => {/* TODO: Handle notifications */}}
      >
        <Bell className="h-5 w-5" />
        {notifications > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {notifications}
          </div>
        )}
      </Button>
    </div>
  </div>
</header>

    {/* Main Content */}
    <main className="flex h-[calc(100vh-64px)]">
      {/* Left Panel */}
      <div style={{ width: `${leftWidth}%` }} className="p-4">
        {/* Upload Card */}
        <Card className="mb-4">
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Video Upload</h2>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <label className="flex flex-col items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    accept="video/mp4,video/avi,video/mov"
                    className="hidden"
                    onChange={handleVideoUpload}
                    disabled={isUploading || isProcessing}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="mt-2 text-sm text-gray-500">Uploading video...</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div 
                          className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">Click or drag video to upload</p>
                      <p className="text-xs text-gray-400 mt-1">MP4, AVI, MOV up to 100MB</p>
                    </div>
                  )}
                </label>
              </div>
              {uploadError && (
                <div className="text-sm text-red-500">
                  ⚠️ {uploadError}
                </div>
              )}
              {videoUrl && !uploadError && (
                <div className="text-sm text-green-500">
                  ✓ Video uploaded successfully
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Frames/Map Card */}
        {/* Frames/Map Card */}
<Card className="h-[calc(100%-160px)]">
  <div className="flex flex-col h-full">
    <div className="border-b p-4">
      <h2 className="text-xl font-semibold">
        {showMap ? 'Incident Location' : 'Incident Frames'}
      </h2>
    </div>
    <div className="flex-1 p-4 relative overflow-auto"> {/* Added overflow-auto here */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-10">
          <div className="text-white text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="mt-2">Processing video...</p>
          </div>
        </div>
      )}
      {showMap ? (
        <div className="h-full bg-blue-50 rounded-lg">
          <img 
            src="/api/placeholder/800/600" 
            alt="Map"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 auto-rows-min">
  {(processedFrames.slice(0, 4).length > 0 ? processedFrames.slice(0, 4) : []).map((frame) => (
    <Card key={frame.id} className="relative aspect-video">
      <img 
        src={frame.src}
        alt={`Incident frame ${frame.id}`}
        className="w-full h-full object-cover rounded-lg"
      />
      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded-md text-sm flex items-center gap-2">
        <Clock className="h-4 w-4" />
        {frame.timestamp}
      </div>
    </Card>
  ))}
</div>
      )}
      {processError && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-100 text-red-600 p-2 rounded">
          {processError}
        </div>
      )}
    </div>
  </div>
</Card>
      </div>
    {/* Resize Handle */}
    <div
        ref={resizeRef}
        className="w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300 hover:w-1 transition-colors"
        onMouseDown={handleMouseDown}
      />

      {/* Right Panel */}
      {/* Right Panel */}
<div style={{ width: `${rightWidth}%` }} className="p-4">
  <Card className="h-full">
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Incident Analysis</h2>
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
            disabled={!incidentReport}
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
      {console.log('incidentReport:', incidentReport)} 
        {isProcessing ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : incidentReport ? (
          <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100">
            <h2 className="text-2xl font-bold text-indigo-700 mb-6">
              Comprehensive Incident Analysis
            </h2>
            
            <div className="space-y-6">
              {/* Vehicle Details Section */}
              <div className="analysis-section">
                <h3 className="text-xl font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <Car className="h-6 w-6" />
                  Vehicle Details
                </h3>
                <div className="pl-4 border-l-4 border-red-200 text-slate-700">
                  {incidentReport.analysis?.vehicleDetails?.map((detail, index) => (
                    <p key={index} className="mb-2">• {detail}</p>
                  ))}
                </div>
              </div>

              {/* Casualties Section */}
              <div className="analysis-section">
                <h3 className="text-xl font-semibold text-amber-600 mb-3 flex items-center gap-2">
                  <UserRound className="h-6 w-6" />
                  Casualties and Trapped Persons
                </h3>
                <div className="pl-4 border-l-4 border-amber-200 text-slate-700">
                  {incidentReport.analysis?.casualties?.map((detail, index) => (
                    <p key={index} className="mb-2">• {detail}</p>
                  ))}
                </div>
              </div>

              {/* Hazard Assessment Section */}
              <div className="analysis-section">
                <h3 className="text-xl font-semibold text-orange-600 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6" />
                  Hazard Assessment
                </h3>
                <div className="pl-4 border-l-4 border-orange-200 text-slate-700">
                  {incidentReport.analysis?.hazards?.map((detail, index) => (
                    <p key={index} className="mb-2">• {detail}</p>
                  ))}
                </div>
              </div>

              {/* Environmental Conditions Section */}
              <div className="analysis-section">
                <h3 className="text-xl font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                  <Cloud className="h-6 w-6" />
                  Environmental Conditions
                </h3>
                <div className="pl-4 border-l-4 border-emerald-200 text-slate-700">
                  {incidentReport.analysis?.environment?.map((detail, index) => (
                    <p key={index} className="mb-2">• {detail}</p>
                  ))}
                </div>
              </div>

              {/* Emergency Services Section */}
              <div className="analysis-section">
                <h3 className="text-xl font-semibold text-blue-600 mb-3 flex items-center gap-2">
                  <Siren className="h-6 w-6" />
                  Emergency Services Required
                </h3>
                <div className="pl-4 border-l-4 border-blue-200 text-slate-700">
                  {incidentReport.analysis?.services?.map((detail, index) => (
                    <p key={index} className="mb-2">• {detail}</p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            Upload a video to begin analysis
          </div>
        )}
      </div>


              {/* Emergency Services Section */}
              <div className="p-4 border-t">
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Emergency Services Required:</h3>
                <div className="space-y-2">
                  <Button
                    variant={selectedServices.police ? "default" : "outline"}
                    className={`w-full justify-start ${getServiceButtonColor('police', selectedServices.police)}`}
                    onClick={() => setSelectedServices(prev => ({...prev, police: !prev.police}))}
                  >
                    <Shield className="mr-2 h-5 w-5" />
                    Police
                    {analysisKeywords.includes('Vehicle Collision') && 
                      <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded">Recommended</span>
                    }
                  </Button>
                  <Button
                    variant={selectedServices.ambulance ? "default" : "outline"}
                    className={`w-full justify-start ${getServiceButtonColor('ambulance', selectedServices.ambulance)}`}
                    onClick={() => setSelectedServices(prev => ({...prev, ambulance: !prev.ambulance}))}
                  >
                    <Ambulance className="mr-2 h-5 w-5" />
                    Ambulance
                    {(analysisKeywords.includes('Injuries') || analysisKeywords.includes('Critical Condition')) && 
                      <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded">Recommended</span>
                    }
                  </Button>
                  <Button
                    variant={selectedServices.fire ? "default" : "outline"}
                    className={`w-full justify-start ${getServiceButtonColor('fire', selectedServices.fire)}`}
                    onClick={() => setSelectedServices(prev => ({...prev, fire: !prev.fire}))}
                  >
                    <FireExtinguisher className="mr-2 h-5 w-5" />
                    Fire
                    {(analysisKeywords.includes('Fire Hazard') || analysisKeywords.includes('Fuel Leak')) && 
                      <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded">Recommended</span>
                    }
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-4">
  {!isConfirmed ? (
    <>
      <Button 
        variant="destructive"
        className="flex-1 bg-red-600 hover:bg-red-700"
        onClick={() => {
          setSelectedServices({ police: false, ambulance: false, fire: false });
          alert('Incident response cancelled');
        }}
        disabled={isProcessing}
      >
        <X className="mr-2 h-5 w-5" />
        Cancel
      </Button>
      <Button 
        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        onClick={async () => {
          if (Object.values(selectedServices).some(v => v)) {
            try {
              // Uncomment this section for the demo
              /*
              const response = await fetch('http://localhost:8000/api/phone-call', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  incidentAnalysis: incidentReport
                })
              });
      
              if (!response.ok) {
                throw new Error('Failed to initiate phone call');
              }
              */
      
              alert('Emergency services would be dispatched in production');
              setIsConfirmed(true); // Show notes section
            } catch (error) {
              console.error('Phone call failed:', error);
              alert('Failed to initiate phone call');
            }
          } else {
            alert('Please select at least one emergency service');
          }
        }}
        disabled={isProcessing || !Object.values(selectedServices).some(v => v)}
      >
        <Check className="mr-2 h-5 w-5" />
        Confirm
      </Button>
    </>
  ) : (
    <div className="w-full space-y-4">
      <div className="flex flex-col">
        <label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-1">
          Additional Notes
        </label>
        <textarea
          id="notes"
          className="min-h-[100px] p-2 border border-gray-300 rounded-md"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes about the incident..."
        />
      </div>
      <Button 
        className="w-full bg-blue-600 hover:bg-blue-700"
        onClick={handleSaveNotes}
        disabled={isSaving}
      >
        {isSaving ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <Save className="mr-2 h-5 w-5" />
        )}
        Save Incident Details
      </Button>
    </div>
  )}
</div>

              
            </div>
          </div>
        </Card>
      </div>
    </main>
  </div>
);
};

export default EmergencyDashboard;