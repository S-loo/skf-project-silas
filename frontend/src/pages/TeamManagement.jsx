import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { Users, Briefcase, CheckCircle, AlertCircle } from 'lucide-react';

export default function TeamManagement() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataService.team
      .list()
      .then(res => setMembers(res.data))
      .finally(() => setLoading(false));
  }, []);

  const getWorkloadColor = (score) => {
    if (score > 7) return '#D13212';
    if (score > 4) return '#FF9900';
    return '#1D8102';
  };

  const getWorkloadLabel = (score) => {
    if (score > 7) return 'Overloaded';
    if (score > 4) return 'Heavy';
    if (score > 0) return 'Moderate';
    return 'Available';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const active = members.filter(m => m.status === 'active');
  const inactive = members.filter(m => m.status === 'inactive');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* STATS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14
        }}
      >
        {[
          { label: 'Total Members', value: members.length, color: '#0972D3', icon: Users },
          { label: 'Active', value: active.length, color: '#1D8102', icon: CheckCircle },
          { label: 'Inactive', value: inactive.length, color: '#5F6B7A', icon: AlertCircle },
          { label: 'Overloaded', value: members.filter(m => m.workload_score > 7).length, color: '#D13212', icon: Briefcase },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="stat-card" style={{ minWidth: 0 }}>
            <div className="stat-icon" style={{ background: color + '18' }}>
              <Icon size={20} color={color} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TABLE CARD */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #D5DBDB',
            fontSize: 14,
            fontWeight: 700,
            color: '#16191F'
          }}
        >
          Team Roster
        </div>

        {members.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <Users size={40} />
            <h3>No team members</h3>
            <p>Members are created automatically when users register.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 700, width: '100%' }}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Skills</th>
                  <th>Workload</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {members.map(m => {
                  const name = m.user
                    ? `${m.user.first_name} ${m.user.last_name}`
                    : 'Unknown';

                  const initials = m.user
                    ? `${m.user.first_name?.[0] || ''}${m.user.last_name?.[0] || ''}`
                    : '?';

                  const wColor = getWorkloadColor(m.workload_score);

                  return (
                    <tr key={m.id}>
                      {/* MEMBER */}
                      <td style={{ minWidth: 180 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: '#FF990018',
                            border: '1px solid #FF990040',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#FF9900',
                            flexShrink: 0,
                          }}>
                            {initials}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: '#16191F',
                                fontSize: 13,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 140
                              }}
                            >
                              {name}
                            </div>

                            <div
                              style={{
                                fontSize: 11,
                                color: '#5F6B7A',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 140
                              }}
                            >
                              {m.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* ROLE */}
                      <td>
                        <span style={{
                          fontSize: 12,
                          textTransform: 'capitalize',
                          color: '#5F6B7A',
                          whiteSpace: 'nowrap'
                        }}>
                          {m.user?.role?.replace('_', ' ')}
                        </span>
                      </td>

                      {/* SKILLS */}
                      <td style={{ minWidth: 160 }}>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 4,
                          maxWidth: 200
                        }}>
                          {(m.skills || []).length === 0 ? (
                            <span style={{
                              fontSize: 11,
                              color: '#5F6B7A',
                              fontStyle: 'italic'
                            }}>
                              No skills listed
                            </span>
                          ) : (
                            m.skills.map((skill, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: 11,
                                  background: '#F8FAFC',
                                  border: '1px solid #D5DBDB',
                                  borderRadius: 3,
                                  padding: '2px 6px',
                                  color: '#5F6B7A',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {skill}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* WORKLOAD */}
                      <td style={{ minWidth: 180 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar-track" style={{ flex: 1 }}>
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${Math.min((m.workload_score / 10) * 100, 100)}%`,
                                background: wColor
                              }}
                            />
                          </div>

                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: wColor,
                            whiteSpace: 'nowrap'
                          }}>
                            {m.workload_score} · {getWorkloadLabel(m.workload_score)}
                          </span>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 3,
                          background: m.status === 'active' ? '#D4EDDA' : '#F0F0F0',
                          color: m.status === 'active' ? '#1D8102' : '#5F6B7A',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap'
                        }}>
                          {m.status}
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}