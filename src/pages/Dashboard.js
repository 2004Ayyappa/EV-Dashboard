import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import EVLogo from '../assets/logo.png'; // Adjust the path to your actual logo


import { 
  Box, Container, Grid, Typography, Button, Paper, 
  CircularProgress, LinearProgress, IconButton, 
  Dialog, DialogTitle, DialogContent,
  DialogActions, Card, CardContent, Divider, Chip
} from '@mui/material';
import {
  Battery90Outlined, 
  SpeedOutlined, 
  ThermostatOutlined, 
  ElectricBoltOutlined,
  LocalGasStationOutlined,
  TireRepairOutlined,
  SettingsOutlined,
  WbSunnyOutlined,
  EmergencyOutlined,
  WarningOutlined,
  NatureOutlined,
  DirectionsTransitOutlined,
  MyLocationOutlined,
  SearchOutlined,
  KeyboardOutlined,
  BoltOutlined,
  EvStationOutlined,
  SettingsSuggestOutlined,
  SpeedRounded
} from '@mui/icons-material';
// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DB_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const Dashboard = () => {
  // State for vehicle data
  const [vehicleData, setVehicleData] = useState({
    speed: 0,
    batteryTemp: 0,
    voltage: 0,
    soc: 0,
    soh: 0,
    range: 0,
    torque: 0,
    tyre_pressure: 0,
    rpm: 0,
    current: 0,
    motor_temp: 0,
    temp: 0,
    charging_status: 'Not Charging',
    mode: 'Normal',
    latitude: 0,
    longitude: 0,
    date: new Date(),
    isConnected: false
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Add map location state to track search results separately from vehicle location
  const [mapLocation, setMapLocation] = useState({
    lat: 0,
    lng: 0,
    isSearchResult: false
  });
  // Add loading state for geocoding
  const [searchLoading, setSearchLoading] = useState(false);
  // Add error state for geocoding
  const [searchError, setSearchError] = useState('');
  
  // Mode options
  const modes = ['Eco', 'Normal', 'Sport'];
  
  // Function buttons
  const functionButtons = [
    { name: 'SOS', icon: <EmergencyOutlined />, color: 'error' },
    { name: 'Pothole Alert', icon: <WarningOutlined />, color: 'warning' },
    { name: 'CO₂ Saved', icon: <NatureOutlined />, color: 'success' },
    { name: 'Transit Stats', icon: <DirectionsTransitOutlined />, color: 'info', highlighted: true }
  ];
  
  // Fetch data from Firebase
  useEffect(() => {
    setLoading(true);
    
    try {
      // Notice we're now pointing to the root of the database since your data isn't nested
      const dbRef = ref(database);
      
      // Set up real-time listener
      const unsubscribe = onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Process and format the data to match our state structure
          const updatedVehicleData = {
            speed: parseFloat(data.speed) || 0,
            batteryTemp: parseFloat(data.temp) || 0,
            voltage: parseFloat(data.voltage) || 0,
            soc: parseFloat(data.soc) || 0,
            soh: parseFloat(data.soh) || 98.68, // Using the value from your screenshot
            range: calculateRange(parseFloat(data.soc) || 0), // Calculate based on SOC
            torque: parseFloat(data.torque) || 0,
            tyre_pressure: parseFloat(data.tyre_pressure) || 0,
            rpm: parseFloat(data.rpm) || 0,
            current: parseFloat(data.current) || 0,
            motor_temp: parseFloat(data.motor_temp) || 0,
            temp: parseFloat(data.temp) || 0,
            charging_status: data.charging_status || 'Not Charging',
            mode: vehicleData.mode, // Keep current mode selection
            latitude: parseFloat(data.latitude) || 0,
            longitude: parseFloat(data.longitude) || 0,
            date: new Date(),
            isConnected: true
          };
          
          setVehicleData(updatedVehicleData);
          
          // Initialize map location with vehicle location if not already set
          if (!mapLocation.isSearchResult) {
            setMapLocation({
              lat: updatedVehicleData.latitude,
              lng: updatedVehicleData.longitude,
              isSearchResult: false
            });
          }
        } else {
          console.log('No data available');
          setVehicleData(prev => ({
            ...prev,
            date: new Date(),
            isConnected: false
          }));
        }
        setLoading(false);
      }, (error) => {
        console.error('Firebase data fetch error:', error);
        setError('Failed to connect to the vehicle. Please check your connection.');
        setLoading(false);
      });
      
      // Clean up the listener
      return () => unsubscribe();
    } catch (err) {
      console.error('Firebase setup error:', err);
      setError('Failed to initialize connection to the vehicle.');
      setLoading(false);
    }
  }, []);
  
  // Helper function to calculate range based on battery percentage
  const calculateRange = (soc) => {
    // Assuming a full charge gives 100km range
    const maxRange = 100;
    return Math.round((soc / 100) * maxRange);
  };
  
  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    });
  };
  
  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };
  
  // Function to geocode the search query
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    setSearchError('');
    
    try {
      // Using the Nominatim API since it doesn't require an API key
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        setMapLocation({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          isSearchResult: true
        });
        setSearchError('');
      } else {
        setSearchError('No results found');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Failed to search location');
    } finally {
      setSearchLoading(false);
      setShowKeyboard(false);
    }
  };
  
  // Function to reset map to vehicle location
  const resetMapToVehicle = () => {
    setMapLocation({
      lat: vehicleData.latitude,
      lng: vehicleData.longitude,
      isSearchResult: false
    });
    setSearchQuery('');
  };
  
  // Check if vehicle is charging
  const isCharging = vehicleData.charging_status === 'Charging';
  
  // Virtual keyboard component
  const VirtualKeyboard = () => {
    const rows = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', ',']
    ];
    
    const handleKeyPress = (key) => {
      if (key === 'Space') {
        setSearchQuery(prev => prev + ' ');
      } else if (key === 'Backspace') {
        setSearchQuery(prev => prev.slice(0, -1));
      } else {
        setSearchQuery(prev => prev + key);
      }
    };
    
    return (
      <Box sx={{ 
        position: 'absolute', 
        bottom: 0, 
        width: '100%', 
        bgcolor: 'rgba(0,0,0,0.8)',
        padding: 1,
        borderRadius: 2,
        zIndex: 10
      }}>
        {rows.map((row, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
            {row.map(key => (
              <Button 
                key={key} 
                variant="contained" 
                size="small"
                sx={{ 
                  mx: 0.5, 
                  minWidth: '30px', 
                  height: '30px',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.25)'
                  }
                }}
                onClick={() => handleKeyPress(key)}
              >
                {key}
              </Button>
            ))}
          </Box>
        ))}
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
          <Button 
            variant="contained" 
            sx={{ 
              width: '60%', 
              mx: 1,
              bgcolor: 'rgba(255,255,255,0.15)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.25)'
              }
            }}
            onClick={() => handleKeyPress('Space')}
          >
            Space
          </Button>
          <Button 
            variant="contained" 
            sx={{ 
              width: '30%', 
              mx: 1,
              bgcolor: 'rgba(255,255,255,0.15)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.25)'
              }
            }}
            onClick={() => handleKeyPress('Backspace')}
          >
            Backspace
          </Button>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Button 
            variant="contained" 
            color="primary"
            sx={{ width: '80%' }}
            onClick={handleSearch}
            disabled={searchLoading}
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </Button>
        </Box>
      </Box>
    );
  };
  
  // SOS Dialog
  const [sosDialogOpen, setSosDialogOpen] = useState(false);
  
  const handleSOSClick = () => {
    setSosDialogOpen(true);
  };
  
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          bgcolor: '#0a1929',
          color: 'white'
        }}
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6">Connecting to EV System...</Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          bgcolor: '#0a1929',
          color: 'white',
          p: 3
        }}
      >
        <WarningOutlined sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" sx={{ mb: 2, textAlign: 'center' }}>Connection Error</Typography>
        <Typography sx={{ textAlign: 'center' }}>{error}</Typography>
        <Button 
          variant="contained" 
          sx={{ mt: 3 }}
          onClick={() => window.location.reload()}
        >
          Retry Connection
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', md: 'row' },
      bgcolor: '#081624', // Darker background for better contrast
      color: 'white',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Left Panel - Dashboard */}
      <Box sx={{ 
        width: { xs: '100%', md: '50%' }, 
        p: 3, 
        borderRight: '1px solid rgba(255,255,255,0.12)',
        overflowY: 'auto',
        background: 'linear-gradient(135deg, #071219 0%, #0d2744 100%)' // Darker gradient
      }}>
        {/* Header with status and connection */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3 
        }}>
          <img 
    src={EVLogo} 
    alt="EV Logo" 
    style={{ width: 80, height: 80 }} // Adjust size as needed
  />
          <Typography 
            variant="h5" 
            component="h1" 
            sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #4fa8df 30%, #82c8ff 90%)', // Brighter gradient
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            EV Dashboard
          </Typography>
          <Chip
            icon={vehicleData.isConnected ? <MyLocationOutlined /> : null}
            label={vehicleData.isConnected ? 'Connected' : 'Disconnected'}
            color={vehicleData.isConnected ? "success" : "error"}
            variant="outlined"
            sx={{ borderRadius: 5 }}
          />
        </Box>
        
        {/* Date, Time and Weather */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mb: 3,
          p: 2,
          borderRadius: 2,
          bgcolor: 'rgba(11, 76, 96, 0.49)', // Slightly brighter for better visibility
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ opacity: 0.8, mr: 1 }}>
              {formatDate(vehicleData.date)}
            </Typography>
            <Typography sx={{ fontWeight: 'bold' }}>
              {formatTime(vehicleData.date)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WbSunnyOutlined sx={{ color: 'orange', mr: 1 }} />
            <Typography>{vehicleData.temp}°C</Typography>
          </Box>
        </Box>
        
        {/* Main Stats Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Speedometer */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: 'rgba(30, 65, 100, 0.7)', // More vivid blue
              borderRadius: 4,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              height: '100%'
            }}>
              <CardContent sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                p: 3
              }}>
                <Typography color="white" variant="subtitle1" sx={{ mb: 1, opacity: 0.8 }}>
                  Speed
                </Typography>
                <Box sx={{ position: 'relative', mb: 1 }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={(vehicleData.speed / 200) * 100} 
                    size={160}
                    thickness={4}
                    sx={{ 
                      color: vehicleData.speed > 100 ? '#f44336' : '#4db8ff', // Brighter blue
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      }
                    }}
                  />
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <SpeedRounded sx={{ fontSize: 24, color: 'rgba(255,255,255,0.7)', mb: 1 }} />
                    <Typography variant="h3" sx={{ fontWeight: 'bold', lineHeight: 1, color: 'white' }}>
                      {vehicleData.speed.toFixed(1)}
                    </Typography>
                    <Typography color="white" variant="body2" sx={{ opacity: 0.7 }}>
                      KM/H
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Battery Status */}
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: 'rgba(30, 65, 100, 0.7)', // More vivid blue
              borderRadius: 4,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              height: '100%'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" color="white" sx={{ opacity: 0.8 }}>Battery Status</Typography>
                  <Chip 
                    size="small"
                    icon={<EvStationOutlined />} 
                    label={isCharging ? 'Charging' : 'Not Charging'}
                    color={isCharging ? "success" : "default"}
                    variant="outlined"
                    sx={{ borderColor: isCharging ? '#4caf50' : 'rgba(255,255,255,0.3)' }}
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography color="white" variant="body2" sx={{ mb: 0.5, opacity: 0.8 }}>
                    State of Charge
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={vehicleData.soc}
                        sx={{ 
                          height: 10, 
                          borderRadius: 5,
                          bgcolor: 'rgba(255,255,255,0.15)', // Slightly brighter
                          '& .MuiLinearProgress-bar': {
                            bgcolor: vehicleData.soc < 20 ? '#f44336' : 
                                  vehicleData.soc < 40 ? '#ff9800' : '#4caf50',
                            transition: 'transform 0.4s linear'
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'white' }}>
                        {`${vehicleData.soc.toFixed(1)}%`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography color="white" variant="body2" sx={{ opacity: 0.8 }}>Range</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {vehicleData.range} km
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography color="white" variant="body2" sx={{ opacity: 0.8 }}>Temperature</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {vehicleData.batteryTemp.toFixed(1)}°C
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Mode Selection */}
        <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Drive Mode</Typography>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            mb: 4
          }}
        >
          {modes.map(mode => (
            <Button
              key={mode}
              variant={vehicleData.mode === mode ? "contained" : "outlined"}
              color={
                mode === 'Eco' ? 'success' : 
                mode === 'Sport' ? 'error' : 'primary'
              }
              sx={{ 
                flex: 1, 
                mx: 1,
                borderRadius: 8,
                py: 1.5,
                fontWeight: 'bold',
                boxShadow: vehicleData.mode === mode ? 3 : 0
              }}
              startIcon={
                mode === 'Eco' ? <NatureOutlined /> : 
                mode === 'Sport' ? <SpeedOutlined /> : 
                <SettingsSuggestOutlined />
              }
              onClick={() => {
                // Here we would send the mode change to Firebase
                // For demo, just update local state
                setVehicleData({...vehicleData, mode});
              }}
            >
              {mode}
            </Button>
          ))}
        </Box>
        
        {/* Vehicle Metrics */}
        <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Performance Metrics</Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {/* Create metric cards based on actual Firebase data */}
          {[
            { label: 'Torque', value: `${vehicleData.torque.toFixed(1)} Nm`, icon: <BoltOutlined /> },
            { label: 'RPM', value: vehicleData.rpm, icon: <SettingsSuggestOutlined /> },
            { label: 'Tyre Pressure', value: `${vehicleData.tyre_pressure.toFixed(1)} PSI`, icon: <TireRepairOutlined /> },
            { label: 'Current', value: `${vehicleData.current.toFixed(1)} A`, icon: <ElectricBoltOutlined /> }
          ].map((metric, index) => (
            <Grid item xs={6} md={3} key={index}>
              <Card sx={{ 
                bgcolor: 'rgba(40, 74, 107, 0.72)', // Deeper blue with more opacity
                borderRadius: 3,
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)'
                }
              }}>
                <CardContent sx={{ 
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <Box sx={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'rgba(255,255,255,0.15)', // Brighter for contrast
                    borderRadius: '50%',
                    p: 1,
                    mb: 1
                  }}>
                    {metric.icon}
                  </Box>
                  <Typography color="white" variant="body2" sx={{ textAlign: 'center', opacity: 0.8 }}>
                    {metric.label}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'center', color: 'white' }}>
                    {metric.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        {/* Additional Technical Data */}
        <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Technical Details</Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} md={4}>
            <Card sx={{ bgcolor: 'rgba(25, 55, 85, 0.7)', borderRadius: 3 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography color="white" variant="body2" sx={{ opacity: 0.8 }}>Voltage</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white' }}>
                  {vehicleData.voltage.toFixed(1)} V
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={4}>
            <Card sx={{ bgcolor: 'rgba(25, 55, 85, 0.7)', borderRadius: 3 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography color="white" variant="body2" sx={{ opacity: 0.8 }}>Motor Temp</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white' }}>
                  {vehicleData.motor_temp.toFixed(1)}°C
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={4}>
            <Card sx={{ bgcolor: 'rgba(25, 55, 85, 0.7)', borderRadius: 3 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography color="white" variant="body2" sx={{ opacity: 0.8 }}>Battery Health</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white' }}>
                  {vehicleData.soh.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Function Buttons */}
        <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Quick Actions</Typography>
        <Grid container spacing={2}>
          {functionButtons.map(btn => (
            <Grid item xs={6} sm={3} key={btn.name}>
              <Button
                variant={btn.highlighted ? "contained" : "outlined"}
                color={btn.color}
                fullWidth
                startIcon={btn.icon}
                sx={{ 
                  borderRadius: 2,
                  p: 1.5,
                  boxShadow: btn.highlighted ? 6 : 0,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'scale(1.05)'
                  }
                }}
                onClick={btn.name === 'SOS' ? handleSOSClick : null}
              >
                {btn.name}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>
      
      {/* Right Panel - Google Maps */}
      <Box sx={{ 
        width: { xs: '100%', md: '50%' }, 
        position: 'relative', 
        height: { xs: '400px', md: '100vh' }
      }}>
        {/* Map container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            bgcolor: '#242f3e', // Map background color
            overflow: 'hidden'
          }}
        >
          {/* Actual map iframe */}
          <Box sx={{ width: '100%', height: '100%' }}>
            <iframe 
              src={`https://maps.google.com/maps?q=${mapLocation.lat},${mapLocation.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              width="100%" 
              height="100%" 
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </Box>
          {/* Search bar */}
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              right: 10,
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'rgba(255,255,255,0.9)',
              borderRadius: 8,
              p: 0.5,
              boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
            }}
          >
            <SearchOutlined sx={{ color: 'grey.600', mx: 1 }} />
            <input
              type="text"
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                padding: '10px',
                background: 'transparent',
                fontSize: '14px'
              }}
            />
            <IconButton 
              size="small" 
              onClick={() => setShowKeyboard(!showKeyboard)}
              sx={{ bgcolor: 'rgba(0,0,0,0.05)', mr: 0.5 }}
            >
              <KeyboardOutlined />
            </IconButton>
          </Box>
          
          {/* EV Bike location info */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              bgcolor: 'rgba(0,0,0,0.8)', // Darker for better contrast
              borderRadius: 2,
              p: 2,
              display: 'flex',
              alignItems: 'center',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Box sx={{ 
              bgcolor: '#2196f3', 
              borderRadius: '50%', 
              p: 1, 
              mr: 2,
              display: 'flex' 
            }}>
              <DirectionsTransitOutlined />
            </Box>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'white' }}>EV Location</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, color: 'white' }}>
                Lat: {vehicleData.latitude.toFixed(6)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, color: 'white' }}>
                Long: {vehicleData.longitude.toFixed(6)}
              </Typography>
            </Box>
          </Box>
          
          {/* Virtual keyboard */}
          {showKeyboard && <VirtualKeyboard />}
        </Box>
      </Box>
      
      {/* SOS Dialog */}
      <Dialog
        open={sosDialogOpen}
        onClose={() => setSosDialogOpen(false)}
        sx={{
          '& .MuiPaper-root': {
            bgcolor: '#1a2635',
            color: 'white',
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          color: 'error.main',
          display: 'flex',
          alignItems: 'center'
        }}>
          <EmergencyOutlined sx={{ mr: 1 }} />
          Emergency SOS
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            
            This will send an emergency alert with your current location to emergency services and your emergency contacts.
          </Typography>
          <Box sx={{ 
            textAlign: 'center', 
            my: 2, 
            bgcolor: 'rgba(255,255,255,0.05)',
            borderRadius: 2,
            p: 2
          }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Current Location:</Typography>
            <Typography sx={{ mb: 0.5 }}>
              Latitude: {vehicleData.latitude.toFixed(6)}
            </Typography>
            <Typography>
              Longitude: {vehicleData.longitude.toFixed(6)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setSosDialogOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            color="error" 
            variant="contained" 
            onClick={() => setSosDialogOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            Send SOS
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;