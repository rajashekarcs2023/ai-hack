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
  Download 
} from 'lucide-react';

const EmergencyDashboard = () => {
  // Service selection states
  const [selectedServices, setSelectedServices] = useState({
    police: true,
    ambulance: true,
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

  // Refs for resize functionality
  const resizeRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Sample data for initial state
  const sampleFrames = Array(4).fill().map((_, i) => ({
    id: i + 1,
    src: "/api/placeholder/200/150",
    timestamp: `14:${35 + i}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
  }));

  const defaultIncidentDescription = `URGENT: Major Vehicle Collision
Time of Report: 14:35 EST
Location: Main Street & 5th Avenue

PRIMARY ASSESSMENT:
- Multiple vehicle collision (3+ vehicles involved)
- Airbags deployed in all vehicles
- Smoke visible from engine compartment of vehicle 1
- Fuel leak detected
- Traffic signals damaged

INJURIES REPORTED:
- Vehicle 1: Driver trapped, conscious, showing signs of distress
- Vehicle 2: Two occupants, minor visible injuries
- Vehicle 3: Driver and passenger, status uncertain
- Multiple pedestrian witnesses reporting minor injuries

ENVIRONMENTAL CONDITIONS:
- Weather: Clear skies
- Road Surface: Dry
- Traffic: Heavy congestion forming
- Visibility: Good

HAZARDS IDENTIFIED:
- Active fuel leak from Vehicle 1
- Smoke intensifying
- Live traffic approaching scene
- Damaged infrastructure

IMMEDIATE NEEDS:
- Heavy rescue equipment required
- Multiple ambulance units recommended
- Fire suppression standby
- Traffic control urgently needed

ADDITIONAL NOTES:
- Large crowd gathering
- Media presence likely
- Adjacent businesses affected
- Power lines potentially compromised

WITNESS INFORMATION:
- Multiple bystanders recording
- Traffic camera footage available
- Dashcam footage reported available
- First responders already on scene report needed

RESOURCE REQUESTS:
- Multiple ambulance units
- Heavy rescue equipment
- Hazmat team standby
- Traffic division support`;

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
      
      if (result.status === 'success') {
        setProcessedFrames(result.frames || []);
        setIncidentReport(result.report || defaultIncidentDescription);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-[2000px] mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Emergency Incident Dashboard</h1>
          <Button 
            variant="outline"
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-2"
          >
            {showMap ? <Images className="h-5 w-5" /> : <Map className="h-5 w-5" />}
            {showMap ? 'Show Frames' : 'Show Map'}
          </Button>
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
                      disabled={isUploading}
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
                {videoUrl && (
                  <div className="text-sm text-green-500">
                    ✓ Video uploaded successfully
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Frames/Map Card */}
          <Card className="h-[calc(100%-160px)]">
            <div className="flex flex-col h-full">
              <div className="border-b p-4">
                <h2 className="text-xl font-semibold">
                  {showMap ? 'Incident Location' : 'Incident Frames'}
                </h2>
              </div>
              <div className="flex-1 p-4 relative">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 auto-rows-fr gap-4 h-full">
                    {(processedFrames.length > 0 ? processedFrames : sampleFrames).map((frame) => (
                      <Card key={frame.id} className="relative overflow-hidden">
                        <img 
                          src={frame.src}
                          alt={`Incident frame ${frame.id}`}
                          className="w-full h-full object-cover"
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
        <div style={{ width: `${rightWidth}%` }} className="p-4">
          <Card className="h-full">
            <div className="flex flex-col h-full">
              <div className="border-b p-4">
              <div className="flex justify-between items-center">

                <h2 className="text-xl font-semibold">Incident Analysis</h2>
                <Button
                    variant="outline"
                    onClick={() => console.log('Export functionality to be implemented')}
                    className="flex items-center gap-2"
                >
                    <Download className="h-4 w-4" />
                    Export Report
                </Button>
              </div>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Scrollable Text Area */}
                <div className="h-[40vh] overflow-auto border rounded-lg p-4">
                  <Alert>
                    <AlertDescription className="whitespace-pre-line">
                      {incidentReport || defaultIncidentDescription}
                    </AlertDescription>
                  </Alert>
                </div>
      
                    {/* Emergency Services Section - Fixed Position */}
                    <div className="space-y-4">
  <h3 className="font-medium text-lg">Emergency Services Required:</h3>
  <div className="space-y-2">
    <Button
      variant={selectedServices.police ? "default" : "outline"}
      className={`w-full justify-start ${
        selectedServices.police ? 'bg-blue-600 hover:bg-blue-700' : ''
      }`}
      onClick={() => setSelectedServices(prev => ({...prev, police: !prev.police}))}
    >
      <Shield className="mr-2 h-5 w-5" />
      Police
    </Button>
    <Button
      variant={selectedServices.ambulance ? "default" : "outline"}
      className={`w-full justify-start ${
        selectedServices.ambulance ? 'bg-blue-600 hover:bg-blue-700' : ''
      }`}
      onClick={() => setSelectedServices(prev => ({...prev, ambulance: !prev.ambulance}))}
    >
      <Ambulance className="mr-2 h-5 w-5" />
      Ambulance
    </Button>
    <Button
      variant={selectedServices.fire ? "default" : "outline"}
      className={`w-full justify-start ${
        selectedServices.fire ? 'bg-blue-600 hover:bg-blue-700' : ''
      }`}
      onClick={() => setSelectedServices(prev => ({...prev, fire: !prev.fire}))}
    >
      <FireExtinguisher className="mr-2 h-5 w-5" />
      Fire
    </Button>
  </div>
</div>
      
{/* Action Buttons - Fixed at Bottom */}
    <div className="flex gap-4 mt-4">
  <Button 
    variant="destructive"
    className="flex-1 bg-red-600 hover:bg-red-700"
    onClick={() => alert('Incident response cancelled')}
  >
    <X className="mr-2 h-5 w-5" />
    Cancel
  </Button>
  <Button 
    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
    onClick={() => alert('Emergency services dispatched')}
  >
    <Check className="mr-2 h-5 w-5" />
    Confirm
  </Button>
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