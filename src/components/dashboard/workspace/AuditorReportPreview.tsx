import React from 'react';

const AuditorReportPreview = () => {
 const clientName = "Northline Precision Manufacturing Inc.";
 const periodEnd = "December 31, 2025";
 const firmName = "Maple Grove Accounting Professional Corporation";
 const firmCity = "Toronto, Ontario";
 const firmDate = "March 14, 2026";

 const sectionTitle = (text: string) => (
  <p style={{ fontWeight: 700, marginBottom: 8, marginTop: 20, lineHeight: 1.7 }}>{text}</p>
 );
 const para = (content: React.ReactNode, extraStyle?: React.CSSProperties) => (
  <p style={{ marginBottom: 16, lineHeight: 1.7, textAlign: "justify", ...extraStyle }}>{content}</p>
 );

 return (
  <div className="flex-1 flex items-start justify-center overflow-y-auto py-10 bg-muted/30">
   <div
    data-fs-page
    className="bg-white shadow-lg border border-border"
    style={{
     width: 842,
     minHeight: 1191,
     fontFamily: "'Arial', 'Helvetica', sans-serif",
     fontSize: 14,
     color: "#1a1a2e",
     position: "relative",
     overflow: "hidden",
     display: "flex",
     flexDirection: "column",
    }}
   >
    {/* Header */}
    <div style={{ background: "hsl(220 15% 96%)", padding: "32px 48px", textAlign: "center", fontSize: 13, color: "#5a5a6e" }}>
     Header will come here
    </div>

    {/* Body */}
    <div style={{ flex: 1, padding: "40px 48px 40px" }}>
     {/* Title */}
     <h1 style={{ textAlign: "center", fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 28, color: "#1a1a2e" }}>
      Independent Auditor's Report
     </h1>

     {/* Addressee */}
     {para(<>To the Shareholders of <strong>{clientName}</strong>:</>)}

     {sectionTitle("Opinion")}
     {para(<>
      We have audited the financial statements of <strong>{clientName}</strong> (the "Company"),
      which comprise the balance sheet as at {periodEnd}, and the statements of income (loss)
      and retained earnings (deficit) and cash flows for the year then ended, and notes to the
      financial statements, including a summary of significant accounting policies.
     </>)}
     {para(<>
      In our opinion, the accompanying financial statements present fairly, in all material
      respects, the financial position of the Company as at {periodEnd}, and the results of its
      operations and its cash flows for the year then ended in accordance with Canadian Accounting
      Standards for Private Enterprises (ASPE).
     </>)}

     {sectionTitle("Basis for Opinion")}
     {para(<>
      We conducted our audit in accordance with Canadian generally accepted auditing standards.
      Our responsibilities under those standards are further described in the{" "}
      <em>Auditor's Responsibilities for the Audit of the Financial Statements</em> section of our
      report. We are independent of the Company in accordance with the ethical requirements that are
      relevant to our audit of the financial statements in Canada, and we have fulfilled our other
      ethical responsibilities in accordance with these requirements. We believe that the audit
      evidence we have obtained is sufficient and appropriate to provide a basis for our opinion.
     </>)}

     {sectionTitle("Responsibilities of Management and Those Charged with Governance for the Financial Statements")}
     {para(<>
      Management is responsible for the preparation and fair presentation of the financial
      statements in accordance with ASPE, and for such internal control as management determines
      is necessary to enable the preparation of financial statements that are free from material
      misstatement, whether due to fraud or error.
     </>)}
     {para(<>
      In preparing the financial statements, management is responsible for assessing the Company's
      ability to continue as a going concern, disclosing, as applicable, matters related to going
      concern and using the going concern basis of accounting unless management either intends to
      liquidate the Company or to cease operations, or has no realistic alternative but to do so.
      Those charged with governance are responsible for overseeing the Company's financial
      reporting process.
     </>)}

     {sectionTitle("Auditor's Responsibilities for the Audit of the Financial Statements")}
     {para(<>
      Our objectives are to obtain reasonable assurance about whether the financial statements as
      a whole are free from material misstatement, whether due to fraud or error, and to issue an
      auditor's report that includes our opinion. Reasonable assurance is a high level of
      assurance, but is not a guarantee that an audit conducted in accordance with Canadian
      generally accepted auditing standards will always detect a material misstatement when it
      exists.
     </>)}
     {para("As part of an audit in accordance with Canadian generally accepted auditing standards, we exercise professional judgment and maintain professional skepticism throughout the audit. We also:")}
     <ul style={{ marginBottom: 16, paddingLeft: 24, lineHeight: 1.7 }}>
      <li style={{ marginBottom: 8 }}>Identify and assess the risks of material misstatement of the financial statements, whether due to fraud or error, design and perform audit procedures responsive to those risks, and obtain audit evidence that is sufficient and appropriate to provide a basis for our opinion.</li>
      <li style={{ marginBottom: 8 }}>Obtain an understanding of internal control relevant to the audit in order to design audit procedures that are appropriate in the circumstances, but not for the purpose of expressing an opinion on the effectiveness of the Company's internal control.</li>
      <li style={{ marginBottom: 8 }}>Evaluate the appropriateness of accounting policies used and the reasonableness of accounting estimates and related disclosures made by management.</li>
      <li style={{ marginBottom: 8 }}>Conclude on the appropriateness of management's use of the going concern basis of accounting and whether a material uncertainty exists related to events or conditions that may cast significant doubt on the Company's ability to continue as a going concern.</li>
      <li>Evaluate the overall presentation, structure and content of the financial statements, including the disclosures, and whether the financial statements represent the underlying transactions and events in a manner that achieves fair presentation.</li>
     </ul>
     {para(<>
      We communicate with those charged with governance regarding, among other matters, the
      planned scope and timing of the audit and significant audit findings, including any
      significant deficiencies in internal control that we identify during our audit.
     </>)}

     {/* Signature block */}
     <div style={{ marginTop: 32, lineHeight: 1.7 }}>
      <p style={{ fontWeight: 600 }}>{firmName}</p>
      <p style={{ color: "#5a5a6e" }}>Licensed Public Accountants</p>
      <p style={{ color: "#5a5a6e" }}>{firmCity}</p>
      <p style={{ color: "#5a5a6e" }}>{firmDate}</p>
     </div>
    </div>

    {/* Footer */}
    <div style={{ background: "hsl(220 15% 96%)", padding: "32px 48px", textAlign: "center", fontSize: 13, color: "#5a5a6e" }}>
     Footer will come here
    </div>

    {/* Watermark */}
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-45deg)", fontSize: 64, fontWeight: 700, color: "rgba(0,0,0,0.07)", whiteSpace: "nowrap", pointerEvents: "none", userSelect: "none", letterSpacing: 6 }}>
     DRAFT
    </div>
   </div>
  </div>
 );
};

export default AuditorReportPreview;
