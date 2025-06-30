
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Clock, Database, Wifi, AlertTriangle, CheckCircle, Zap, Shield } from 'lucide-react';

interface PerformanceMetrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  availability: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface PerformanceMonitoringProps {
  metrics: PerformanceMetrics;
  historicalData: any[];
  alerts: any[];
}

export const PerformanceMonitoring: React.FC<PerformanceMonitoringProps> = ({
  metrics,
  historicalData,
  alerts
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeData, setRealTimeData] = useState<any[]>([]);

  useEffect(() => {
    // Simulazione dati real-time
    const interval = setInterval(() => {
      const newDataPoint = {
        time: new Date().toLocaleTimeString(),
        responseTime: Math.random() * 100 + 50,
        errorRate: Math.random() * 2,
        throughput: Math.random() * 1000 + 500,
        cpuUsage: Math.random() * 30 + 20,
        memoryUsage: Math.random() * 40 + 30
      };
      
      setRealTimeData(prev => [...prev.slice(-19), newDataPoint]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'bg-green-100 text-green-800';
    if (value <= thresholds.warning) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const MetricCard = ({ title, value, unit, icon: Icon, status, trend }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}{unit}</p>
            <Badge className={getStatusColor(value, { good: 50, warning: 100 })}>
              {status}
            </Badge>
          </div>
          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Monitoraggio Performance Real-Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="realtime">Real-Time</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="security">Sicurezza</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Tempo Risposta"
                value={metrics.responseTime}
                unit="ms"
                icon={Clock}
                status="Ottimo"
              />
              <MetricCard
                title="Tasso Errori"
                value={metrics.errorRate}
                unit="%"
                icon={AlertTriangle}
                status="Buono"
              />
              <MetricCard
                title="Throughput"
                value={metrics.throughput}
                unit="/min"
                icon={Zap}
                status="Eccellente"
              />
              <MetricCard
                title="Disponibilità"
                value={metrics.availability}
                unit="%"
                icon={CheckCircle}
                status="Perfetto"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Utilizzo Risorse</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">CPU</span>
                        <span className="text-sm text-gray-600">{metrics.cpuUsage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${metrics.cpuUsage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Memoria</span>
                        <span className="text-sm text-gray-600">{metrics.memoryUsage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${metrics.memoryUsage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trend Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="responseTime" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="realtime" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Metriche Real-Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={realTimeData}>
                    <defs>
                      <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#8884d8"
                      fillOpacity={1}
                      fill="url(#colorResponse)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Richieste/sec</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {realTimeData.length > 0 ? Math.round(realTimeData[realTimeData.length - 1]?.throughput / 60) : 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Errori</p>
                    <p className="text-2xl font-bold text-red-600">
                      {realTimeData.length > 0 ? realTimeData[realTimeData.length - 1]?.errorRate?.toFixed(1) : 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">CPU</p>
                    <p className="text-2xl font-bold text-green-600">
                      {realTimeData.length > 0 ? Math.round(realTimeData[realTimeData.length - 1]?.cpuUsage) : 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Memoria</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {realTimeData.length > 0 ? Math.round(realTimeData[realTimeData.length - 1]?.memoryUsage) : 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-100' :
                        alert.severity === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <AlertTriangle className={`h-4 w-4 ${
                          alert.severity === 'critical' ? 'text-red-600' :
                          alert.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{alert.title}</h4>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }>
                          {alert.severity}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Sicurezza Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Firewall</span>
                      <Badge className="bg-green-100 text-green-800">Attivo</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">SSL/TLS</span>
                      <Badge className="bg-green-100 text-green-800">Sicuro</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rate Limiting</span>
                      <Badge className="bg-green-100 text-green-800">Attivo</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Audit Logging</span>
                      <Badge className="bg-green-100 text-green-800">Attivo</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tentativi Sospetti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Ultimi 24h</span>
                      <span className="text-sm font-medium">3 bloccati</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Questa settimana</span>
                      <span className="text-sm font-medium">15 bloccati</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Questo mese</span>
                      <span className="text-sm font-medium">47 bloccati</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
