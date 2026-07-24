// src/SimulacionAlerta.tsx - Para VER cómo se ve
import { AlertCircle, Clock, X } from "lucide-react";

export default function SimulacionAlerta() {
  return (
    <div style={{ padding: '40px', background: '#f3f4f6', minHeight: '100vh' }}>
      <div 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef6c00 100%)',
          color: 'white',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '2px solid #facc15',
          maxWidth: '400px',
          width: '90vw',
          maxHeight: '80vh',
          zIndex: 9999,
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
        }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              padding: '8px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              <AlertCircle size={24} style={{ color: 'white' }} />
            </div>
            <div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                margin: 0 
              }}>
                ¡Alertas de Vencimiento!
              </h3>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: '14px', 
                margin: '4px 0 0 0' 
              }}>
                3 elementos por vencer
              </p>
            </div>
          </div>
          <button style={{ 
            padding: '4px', 
            background: 'rgba(255,255,255,0.2)', 
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <X size={20} style={{ color: 'white' }} />
          </button>
        </div>

        {/* ALERTAS */}
        <div style={{ 
          maxHeight: '256px', 
          overflowY: 'auto', 
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Alerta 1 */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px'
          }}>
            <div style={{ marginTop: '4px' }}>
              <Clock size={18} style={{ color: 'rgba(255,255,255,0.8)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: '600', fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                TechCorp SAC
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Licencia: Office 365 Business
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '11px',
                  borderRadius: '999px',
                  fontFamily: 'monospace'
                }}>
                  5d
                </span>
                <span style={{ fontSize: '12px', opacity: 0.9 }}>
                  05/01/2025
                </span>
              </div>
            </div>
          </div>

          {/* Alerta 2 */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px'
          }}>
            <div style={{ marginTop: '4px' }}>
              <Clock size={18} style={{ color: 'rgba(255,255,255,0.8)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: '600', fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                WebSolutions PE
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Hosting: websolutions.pe
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '11px',
                  borderRadius: '999px',
                  fontFamily: 'monospace'
                }}>
                  7d
                </span>
                <span style={{ fontSize: '12px', opacity: 0.9 }}>
                  07/01/2025
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTONES */}
        <div style={{ 
          paddingTop: '16px', 
          borderTop: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', 
          gap: '8px' 
        }}>
          <button style={{
            flex: 1,
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}>
            Cerrar
          </button>
          <button style={{
            flex: 1,
            padding: '8px 16px',
            background: 'white',
            border: 'none',
            borderRadius: '8px',
            color: '#92400e',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            Ver Todos
          </button>
        </div>

        <div style={{ 
          marginTop: '12px', 
          paddingTop: '12px', 
          borderTop: '1px solid rgba(255,255,255,0.2)',
          textAlign: 'center'
        }}>
          <button style={{
            width: '100%',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '12px',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}>
            No mostrar alertas hoy
          </button>
        </div>
      </div>
    </div>
  );
}