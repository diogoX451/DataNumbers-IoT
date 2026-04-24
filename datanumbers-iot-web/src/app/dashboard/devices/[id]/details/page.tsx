"use client";

import { Row, Col, Card, Badge, ListGroup, Tab, Tabs } from "react-bootstrap";
import { useState, useEffect, Fragment, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    Activity, 
    Wifi, 
    Zap, 
    Clock, 
    Thermometer, 
    Droplets,
    AlertCircle,
    ChevronLeft
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

const DeviceDetails = () => {
  const { id } = useParams();
  const router = useRouter();
  const [liveData, setLiveData] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/api/stream";
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.device_id === id) {
           const timestamp = new Date().toLocaleTimeString();
           const newValue = { time: timestamp, ...data.payload };
           
           setLiveData((prev) => [...prev, newValue].slice(-20));
           setLogs((prev) => [{ 
               time: timestamp, 
               type: 'TELEMETRY', 
               desc: 'Nova leitura recebida',
               data: data.payload 
           }, ...prev].slice(0, 50));
        }
      } catch (err) {
        console.error("WS Error:", err);
      }
    };

    return () => socket.close();
  }, [id]);

  return (
    <Fragment>
      <div className="iot-banner-header pb-32">
        <div className="flex items-center gap-4">
           <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft className="text-white" />
           </button>
           <div>
              <h2 className="text-white font-black tracking-tight mb-1">Painel do Dispositivo</h2>
              <p className="text-indigo-100 opacity-80 text-sm font-medium">Monitoramento analítico individual</p>
           </div>
        </div>
        <div className="flex gap-3">
           <Badge bg="success" className="px-3 py-2 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              SINAL ATIVO
           </Badge>
        </div>
      </div>

      <div className="mx-8 mt-n20">
        <Row>
          <Col lg={8}>
             <Card className="border-0 shadow-xl rounded-2xl overflow-hidden mb-6">
                <Card.Header className="bg-white border-b border-slate-100 py-4 px-6 flex justify-between items-center">
                   <h5 className="mb-0 font-bold text-slate-800 flex items-center gap-2">
                      <Activity size={18} className="text-[#6d5dfc]" />
                      Fluxo de Telemetria
                   </h5>
                </Card.Header>
                <Card.Body className="p-6">
                   <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                         <AreaChart data={liveData}>
                            <defs>
                               <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6d5dfc" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#6d5dfc" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <Tooltip />
                            <Area type="monotone" dataKey="temp" stroke="#6d5dfc" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            <Area type="monotone" dataKey="humidity" stroke="#38bdf8" strokeWidth={3} fillOpacity={0} />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </Card.Body>
             </Card>

             <Card className="border-0 shadow-xl rounded-2xl overflow-hidden mb-6">
                <Card.Body className="p-0">
                   <Tabs defaultActiveKey="logs" className="custom-tabs px-6 pt-4">
                      <Tab eventKey="logs" title="Histórico de Eventos">
                         <div className="p-4">
                            <ListGroup variant="flush">
                               {logs.length > 0 ? logs.map((log, i) => (
                                  <ListGroup.Item key={i} className="border-slate-50 px-0 py-3">
                                     <div className="flex justify-between items-start">
                                        <div className="flex gap-3">
                                           <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                              <Clock size={14} />
                                           </div>
                                           <div>
                                              <p className="text-sm font-bold text-slate-700 mb-0">{log.desc}</p>
                                              <code className="text-[10px] text-indigo-500">{JSON.stringify(log.data)}</code>
                                           </div>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.time}</span>
                                     </div>
                                  </ListGroup.Item>
                               )) : (
                                  <div className="text-center py-10 text-slate-400 small">Aguardando dados...</div>
                               )}
                            </ListGroup>
                         </div>
                      </Tab>
                      <Tab eventKey="config" title="Configurações">
                         <div className="p-10 text-center text-slate-400">
                            Ajustes de hardware disponíveis em breve.
                         </div>
                      </Tab>
                   </Tabs>
                </Card.Body>
             </Card>
          </Col>

          <Col lg={4}>
             <Card className="border-0 shadow-xl rounded-2xl mb-6 bg-[#0f1121] text-white overflow-hidden">
                <Card.Body className="p-6">
                   <h5 className="font-bold mb-6 flex items-center gap-2">
                      <Wifi size={18} className="text-emerald-400" />
                      Status de Conexão
                   </h5>
                   <div className="space-y-6">
                      <div>
                         <small className="text-slate-500 uppercase font-black tracking-widest text-[10px]">Identificador Único</small>
                         <p className="font-mono text-sm text-indigo-300 break-all">{id}</p>
                      </div>
                      <div className="flex justify-between items-center">
                         <div>
                            <small className="text-slate-500 uppercase font-black tracking-widest text-[10px]">Uptime Global</small>
                            <h3 className="font-black text-2xl">99.8%</h3>
                         </div>
                         <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center">
                            <span className="text-[10px] font-black">OK</span>
                         </div>
                      </div>
                   </div>
                </Card.Body>
             </Card>

             <Row className="g-4">
                <Col xs={6}>
                   <Card className="border-0 shadow-xl rounded-2xl text-center p-4">
                      <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                         <Thermometer size={20} />
                      </div>
                      <h4 className="font-black text-slate-800 mb-0">{liveData[liveData.length-1]?.temp || '--'}°C</h4>
                      <small className="text-slate-400 font-bold uppercase text-[9px]">Temperatura</small>
                   </Card>
                </Col>
                <Col xs={6}>
                   <Card className="border-0 shadow-xl rounded-2xl text-center p-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                         <Droplets size={20} />
                      </div>
                      <h4 className="font-black text-slate-800 mb-0">{liveData[liveData.length-1]?.humidity || '--'}%</h4>
                      <small className="text-slate-400 font-bold uppercase text-[9px]">Umidade</small>
                   </Card>
                </Col>
             </Row>
          </Col>
        </Row>
      </div>

      <style jsx global>{`
        .custom-tabs .nav-link {
          border: none !important;
          color: #94a3b8 !important;
          font-weight: 700;
          font-size: 13px;
          padding: 1rem 1.5rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .custom-tabs .nav-link.active {
          color: #6d5dfc !important;
          border-bottom: 3px solid #6d5dfc !important;
          background: transparent !important;
        }
      `}</style>
    </Fragment>
  );
};

export default DeviceDetails;
