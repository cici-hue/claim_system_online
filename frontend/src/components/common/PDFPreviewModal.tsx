import React, { useRef } from 'react'
import { Claim } from '../../types/claim'

interface PDFPreviewModalProps {
  claim: Claim
  onClose: () => void
}

const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({ claim, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RCA-${claim.claimNo}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 10pt; 
              line-height: 1.4;
              color: #333;
            }
            .page { page-break-after: always; }
            .page:last-child { page-break-after: auto; }
            
            h1 { 
              font-size: 24pt; 
              color: #1a3a5c; 
              text-align: center; 
              margin-top: 60mm;
            }
            h2 { 
              font-size: 16pt; 
              color: #1a3a5c; 
              border-bottom: 2px solid #1a3a5c;
              padding-bottom: 5px;
              margin-top: 20px;
            }
            h3 { 
              font-size: 13pt; 
              color: #333;
              margin-top: 15px;
            }
            
            .subtitle {
              font-size: 12pt;
              color: #64748b;
              text-align: center;
            }
            .cover-info {
              text-align: center;
              margin-top: 20mm;
              font-size: 11pt;
              color: #64748b;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            th {
              background: #1a3a5c;
              color: white;
              padding: 8px;
              text-align: left;
              font-size: 9pt;
            }
            td {
              padding: 8px;
              border: 1px solid #e2e8f0;
              font-size: 9pt;
            }
            tr:nth-child(even) { background: #f8fafc; }
            
            .label { 
              background: #f1f5f9; 
              font-weight: bold; 
              width: 30%;
              color: #64748b;
            }
            
            .section-title {
              font-size: 11pt;
              color: #64748b;
              margin-top: -10px;
              margin-bottom: 15px;
            }
            
            .action-immediate { color: #dc2626; }
            .action-mid { color: #d97706; }
            .action-long { color: #16a34a; }
            .action-oi { color: #7c3aed; }
            
            .summary-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 10px;
              margin: 10px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '100%',
        maxWidth: 900,
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1a3a5c', fontWeight: 700 }}>
              RCA PDF Preview
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              {claim.claimNo}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                background: '#22c55e',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <i className="bi bi-printer"></i>
              Print / 打印
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                background: '#f1f5f9',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <i className="bi bi-x-lg"></i>
              Close / 关闭
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#525659',
          padding: 20
        }}>
          <div 
            ref={printRef}
            style={{
              background: '#fff',
              width: '210mm',
              minHeight: '297mm',
              margin: '0 auto',
              padding: '20mm',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            {/* Page 1: Cover */}
            <div className="page" style={{ textAlign: 'center', paddingTop: '40mm' }}>
              <h1 style={{ fontSize: '28pt', color: '#1a3a5c', marginBottom: '10px' }}>
                Root Cause Analysis
              </h1>
              <div style={{ fontSize: '12pt', color: '#64748b', marginBottom: '30mm' }}>
                根本原因分析
              </div>
              
              <div style={{ fontSize: '18pt', color: '#1a3a5c', marginBottom: '20mm' }}>
                {claim.claimNo}
              </div>
              
              <div style={{ fontSize: '11pt', color: '#64748b', lineHeight: 2 }}>
                <div>Vendor / 供应商: {claim.vendor}</div>
                <div>Defect / 缺陷类型: {claim.defectCategory}</div>
                <div>Date / 日期: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {/* Page 2: Basic Information */}
            <div className="page">
              <h2>Basic Information / 基本信息</h2>
              <table>
                <tbody>
                  <tr>
                    <td className="label">Claim No. / 索赔编号</td>
                    <td>{claim.claimNo}</td>
                  </tr>
                  <tr>
                    <td className="label">Vendor / 供应商</td>
                    <td>{claim.vendor}</td>
                  </tr>
                  <tr>
                    <td className="label">Customer / 客户</td>
                    <td>{claim.customer || '-'}</td>
                  </tr>
                  <tr>
                    <td className="label">Defect Category / 缺陷类别</td>
                    <td>{claim.defectCategory}</td>
                  </tr>
                  <tr>
                    <td className="label">Claim Date / 索赔日期</td>
                    <td>{claim.claimDate || '-'}</td>
                  </tr>
                  <tr>
                    <td className="label">Status / 状态</td>
                    <td>{claim.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Page 3: Fishbone Analysis */}
            <div className="page">
              <h2>Fishbone Analysis / 鱼骨图分析</h2>
              
              <table>
                <thead>
                  <tr>
                    <th>Category / 类别</th>
                    <th>Analysis / 分析</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="label">Manpower / 人力</td>
                    <td>{claim.rcaManpower || '-'}</td>
                  </tr>
                  <tr>
                    <td className="label">Machine / 机器</td>
                    <td>{claim.rcaMachine || '-'}</td>
                  </tr>
                  <tr>
                    <td className="label">Material / 材料</td>
                    <td>{claim.rcaMaterial || '-'}</td>
                  </tr>
                  <tr>
                    <td className="label">Method / 方法</td>
                    <td>{claim.rcaMethod || '-'}</td>
                  </tr>
                  <tr>
                    <td className="label">Measurement / 测量</td>
                    <td>{claim.rcaMeasurement || '-'}</td>
                  </tr>
                  <tr>
                    <td className="label">Milieu / 环境</td>
                    <td>{claim.rcaMilieu || '-'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Root Cause Summary */}
              {claim.rcaReasons && claim.rcaReasons.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h3>Root Cause Summary / 根本原因总结</h3>
                  {claim.rcaReasons.map((reason, idx) => (
                    reason.rootCauseSummary && (
                      <div key={idx} className="summary-box">
                        <strong>Reason {idx + 1}:</strong>
                        <div>{reason.rootCauseSummary}</div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Page 4: Corrective Actions */}
            <div className="page">
              <h2>Corrective Actions / 纠正措施</h2>

              {/* Immediate Actions */}
              {claim.rcaReasons?.some(r => r.fac_imm_action) && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 className="action-immediate">Immediate Actions / 立即行动</h3>
                  <table>
                    <thead>
                      <tr style={{ background: '#fee2e2' }}>
                        <th>Action / 行动</th>
                        <th>Person / 负责人</th>
                        <th>Deadline / 截止日期</th>
                        <th>Follow-up / 跟进</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claim.rcaReasons.filter(r => r.fac_imm_action).map((r, idx) => (
                        <tr key={idx}>
                          <td>{r.fac_imm_action}</td>
                          <td>{r.fac_imm_person || '-'}</td>
                          <td>{r.fac_imm_deadline || '-'}</td>
                          <td>{r.fac_imm_followup || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mid-term Actions */}
              {claim.rcaReasons?.some(r => r.fac_mid_action) && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 className="action-mid">Mid-term Actions / 中期行动</h3>
                  <table>
                    <thead>
                      <tr style={{ background: '#fef3c7' }}>
                        <th>Action / 行动</th>
                        <th>Person / 负责人</th>
                        <th>Deadline / 截止日期</th>
                        <th>Follow-up / 跟进</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claim.rcaReasons.filter(r => r.fac_mid_action).map((r, idx) => (
                        <tr key={idx}>
                          <td>{r.fac_mid_action}</td>
                          <td>{r.fac_mid_person || '-'}</td>
                          <td>{r.fac_mid_deadline || '-'}</td>
                          <td>{r.fac_mid_followup || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Long-term Actions */}
              {claim.rcaReasons?.some(r => r.fac_long_action) && (
                <div>
                  <h3 className="action-long">Long-term Actions / 长期行动</h3>
                  <table>
                    <thead>
                      <tr style={{ background: '#dcfce7' }}>
                        <th>Action / 行动</th>
                        <th>Person / 负责人</th>
                        <th>Deadline / 截止日期</th>
                        <th>Follow-up / 跟进</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claim.rcaReasons.filter(r => r.fac_long_action).map((r, idx) => (
                        <tr key={idx}>
                          <td>{r.fac_long_action}</td>
                          <td>{r.fac_long_person || '-'}</td>
                          <td>{r.fac_long_deadline || '-'}</td>
                          <td>{r.fac_long_followup || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Page 5: Other Improvements */}
            {claim.rcaReasons?.some(r => r.oi_action) && (
              <div className="page">
                <h2>Other Improvements / 其他改进</h2>
                <table>
                  <thead>
                    <tr style={{ background: '#f3e8ff' }}>
                      <th>Improvement / 改进项</th>
                      <th>Person / 负责人</th>
                      <th>Deadline / 截止日期</th>
                      <th>Follow-up / 跟进</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claim.rcaReasons.filter(r => r.oi_action).map((r, idx) => (
                      <tr key={idx}>
                        <td>{r.oi_action}</td>
                        <td>{r.oi_person || '-'}</td>
                        <td>{r.oi_deadline || '-'}</td>
                        <td>{r.oi_followup || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PDFPreviewModal
