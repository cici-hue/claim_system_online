import { Claim } from '../types/claim'

// PDF Export Service - Using browser print API
// No external dependencies required

// Generate RCA PDF content as HTML string
export const generateRCAPDFHTML = (claim: Claim): string => {
  return `
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
        <!-- Page 1: Cover -->
        <div class="page" style="text-align: center; padding-top: 40mm;">
          <h1>Root Cause Analysis</h1>
          <div class="subtitle" style="margin-bottom: 30mm;">根本原因分析</div>
          <div style="font-size: 18pt; color: #1a3a5c; margin-bottom: 20mm;">${claim.claimNo}</div>
          <div class="cover-info">
            <div>Vendor / 供应商: ${claim.vendor}</div>
            <div>Defect / 缺陷类型: ${claim.defectCategory}</div>
            <div>Date / 日期: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <!-- Page 2: Basic Information -->
        <div class="page">
          <h2>Basic Information / 基本信息</h2>
          <table>
            <tr><td class="label">Claim No. / 索赔编号</td><td>${claim.claimNo}</td></tr>
            <tr><td class="label">Vendor / 供应商</td><td>${claim.vendor}</td></tr>
            <tr><td class="label">Customer / 客户</td><td>${claim.customer || '-'}</td></tr>
            <tr><td class="label">Defect Category / 缺陷类别</td><td>${claim.defectCategory}</td></tr>
            <tr><td class="label">Claim Date / 索赔日期</td><td>${claim.claimDate || '-'}</td></tr>
            <tr><td class="label">Status / 状态</td><td>${claim.status}</td></tr>
          </table>
        </div>

        <!-- Page 3: Fishbone Analysis -->
        <div class="page">
          <h2>Fishbone Analysis / 鱼骨图分析</h2>
          <table>
            <thead>
              <tr><th>Category / 类别</th><th>Analysis / 分析</th></tr>
            </thead>
            <tbody>
              <tr><td class="label">Manpower / 人力</td><td>${claim.rcaManpower || '-'}</td></tr>
              <tr><td class="label">Machine / 机器</td><td>${claim.rcaMachine || '-'}</td></tr>
              <tr><td class="label">Material / 材料</td><td>${claim.rcaMaterial || '-'}</td></tr>
              <tr><td class="label">Method / 方法</td><td>${claim.rcaMethod || '-'}</td></tr>
              <tr><td class="label">Measurement / 测量</td><td>${claim.rcaMeasurement || '-'}</td></tr>
              <tr><td class="label">Milieu / 环境</td><td>${claim.rcaMilieu || '-'}</td></tr>
            </tbody>
          </table>
          ${claim.rcaReasons && claim.rcaReasons.length > 0 ? `
            <div style="margin-top: 20px;">
              <h3>Root Cause Summary / 根本原因总结</h3>
              ${claim.rcaReasons.map((reason, idx) => reason.rootCauseSummary ? `
                <div class="summary-box">
                  <strong>Reason ${idx + 1}:</strong>
                  <div>${reason.rootCauseSummary}</div>
                </div>
              ` : '').join('')}
            </div>
          ` : ''}
        </div>

        <!-- Page 4: Corrective Actions -->
        <div class="page">
          <h2>Corrective Actions / 纠正措施</h2>
          ${claim.rcaReasons?.some(r => r.fac_imm_action) ? `
            <div style="margin-bottom: 20px;">
              <h3 class="action-immediate">Immediate Actions / 立即行动</h3>
              <table>
                <thead>
                  <tr style="background: #fee2e2;">
                    <th>Action / 行动</th>
                    <th>Person / 负责人</th>
                    <th>Deadline / 截止日期</th>
                    <th>Follow-up / 跟进</th>
                  </tr>
                </thead>
                <tbody>
                  ${claim.rcaReasons.filter(r => r.fac_imm_action).map(r => `
                    <tr>
                      <td>${r.fac_imm_action}</td>
                      <td>${r.fac_imm_person || '-'}</td>
                      <td>${r.fac_imm_deadline || '-'}</td>
                      <td>${r.fac_imm_followup || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          ${claim.rcaReasons?.some(r => r.fac_mid_action) ? `
            <div style="margin-bottom: 20px;">
              <h3 class="action-mid">Mid-term Actions / 中期行动</h3>
              <table>
                <thead>
                  <tr style="background: #fef3c7;">
                    <th>Action / 行动</th>
                    <th>Person / 负责人</th>
                    <th>Deadline / 截止日期</th>
                    <th>Follow-up / 跟进</th>
                  </tr>
                </thead>
                <tbody>
                  ${claim.rcaReasons.filter(r => r.fac_mid_action).map(r => `
                    <tr>
                      <td>${r.fac_mid_action}</td>
                      <td>${r.fac_mid_person || '-'}</td>
                      <td>${r.fac_mid_deadline || '-'}</td>
                      <td>${r.fac_mid_followup || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          ${claim.rcaReasons?.some(r => r.fac_long_action) ? `
            <div>
              <h3 class="action-long">Long-term Actions / 长期行动</h3>
              <table>
                <thead>
                  <tr style="background: #dcfce7;">
                    <th>Action / 行动</th>
                    <th>Person / 负责人</th>
                    <th>Deadline / 截止日期</th>
                    <th>Follow-up / 跟进</th>
                  </tr>
                </thead>
                <tbody>
                  ${claim.rcaReasons.filter(r => r.fac_long_action).map(r => `
                    <tr>
                      <td>${r.fac_long_action}</td>
                      <td>${r.fac_long_person || '-'}</td>
                      <td>${r.fac_long_deadline || '-'}</td>
                      <td>${r.fac_long_followup || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>

        <!-- Page 5: Other Improvements -->
        ${claim.rcaReasons?.some(r => r.oi_action) ? `
          <div class="page">
            <h2>Other Improvements / 其他改进</h2>
            <table>
              <thead>
                <tr style="background: #f3e8ff;">
                  <th>Improvement / 改进项</th>
                  <th>Person / 负责人</th>
                  <th>Deadline / 截止日期</th>
                  <th>Follow-up / 跟进</th>
                </tr>
              </thead>
              <tbody>
                ${claim.rcaReasons.filter(r => r.oi_action).map(r => `
                  <tr>
                    <td>${r.oi_action}</td>
                    <td>${r.oi_person || '-'}</td>
                    <td>${r.oi_deadline || '-'}</td>
                    <td>${r.oi_followup || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </body>
    </html>
  `
}

// Open print dialog for PDF export
export const printRCAPDF = (claim: Claim): void => {
  const html = generateRCAPDFHTML(claim)
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow popups to print PDF')
    return
  }
  
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 250)
}

// Download PDF (same as print, user can save as PDF)
export const downloadRCAPDF = (claim: Claim): void => {
  printRCAPDF(claim)
}
