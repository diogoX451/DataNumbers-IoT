"use client";

import { Table, Badge } from "react-bootstrap";
import useGetAxios from "../../../server/GetAxios";
import Link from "next/link";
import { Fragment } from "react";

const DevicesList = () => {
  const { data, loaded } = useGetAxios<any>("/api/devices/devices", true);

  return (
    <Fragment>
      {/* Modern IoT Header Banner */}
      <div className="iot-banner-header">
        <div>
          <h2 className="text-white font-black tracking-tight mb-1">Meus Dispositivos</h2>
          <p className="text-indigo-100 opacity-80 text-sm font-medium">Gestão total da sua frota de hardware</p>
        </div>
        <Link href="/dashboard/devices/add" className="bg-white text-[#5c56e3] hover:bg-indigo-50 px-6 py-2.5 rounded-xl font-bold transition-all shadow-xl shadow-indigo-900/20 active:scale-95">
          Novo Dispositivo
        </Link>
      </div>

      {/* Modern Table Card */}
      <div className="iot-card-main mt-n12 mb-10 animate-fade-in-up">
        <div className="iot-table-header">
          <h4 className="mb-0 font-black text-slate-800">Todos os Dispositivos</h4>
        </div>
        
        <div className="table-responsive">
          <Table className="text-nowrap mb-0 align-middle">
            <thead className="bg-slate-50/50">
              <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-0">
                <th className="py-4 px-8">Dispositivo</th>
                <th className="py-4">Identificador</th>
                <th className="py-4">Topic</th>
                <th className="py-4">Template Associado</th>
                <th className="py-4">Status</th>
                <th className="py-4">Último Sinal</th>
                <th className="py-4 px-8 text-end">Ações</th>
              </tr>
            </thead>
            <tbody className="border-0">
              {loaded && data?.data ? (
                data.data.map((device: any, index: number) => (
                  <tr key={index} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${device.device_status === 'ONLINE' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                           <i className="fe fe-cpu fs-4"></i>
                        </div>
                        <div>
                           <span className="font-bold text-slate-700 d-block">{device.device_name}</span>
                           <small className="text-muted uppercase text-[10px] font-black tracking-tighter">{device.template_name || "Sensor"}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="iot-badge-id font-mono">{device.device_id?.substring(0, 18)}...</span>
                    </td>
                    <td className="text-slate-500 text-sm font-medium">
                      <code>{device.mqtt_topic}</code>
                    </td>
                    <td className="text-slate-500 text-sm font-bold">
                      {device.template_name || "Padrão"}
                    </td>
                    <td>
                      <div className={`iot-status-pill ${device.device_status === 'ONLINE' ? 'iot-status-online' : ''}`}>
                         <span className={`w-1.5 h-1.5 rounded-full ${device.device_status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                         {device.device_status}
                      </div>
                    </td>
                    <td>
                       <span className="text-muted small font-medium">
                          {device.device_status === 'ONLINE' ? 'Agora mesmo' : 'Há alguns minutos'}
                       </span>
                    </td>
                    <td className="px-8 text-end">
                       <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/devices/${device.device_id}/actuators`} className="iot-btn-outline">
                            Atuadores
                          </Link>
                          <Link href={`/dashboard/devices/${device.device_id}/details`} className="iot-btn-solid bg-indigo-500">
                            Monitorar
                          </Link>
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">
                     {loaded ? "Nenhum dispositivo encontrado" : "Carregando frota..."}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </Fragment>
  );
};

export default DevicesList;
