/**
 * Tech Assessment Certificate Email Template
 * Professional redesign � per-assessment completion message, emoji subject,
 * no localhost URLs, clean layout.
 */
export const getTechAssessmentCertificateTemplate = (
  name: string,
  assessmentTitle: string,
  moduleLabel: string,
  overallScorePercent: number,
  grade: string,
  gradeLabel: string,
  certificateId: string,
  formattedDate: string,
  verifyUrl: string,
  frontendUrl: string,
  assets: { logo: string; footer: string },
  domainPhrase?: string,
) => {
  const scoreColor =
    overallScorePercent >= 70
      ? '#1ED36A'
      : overallScorePercent >= 50
        ? '#f59e0b'
        : '#ef4444';

  // Per-assessment professional completion paragraph
  const completionBody = domainPhrase
    ? domainPhrase
    : `This certificate recognises your commitment to professional growth and your ability to perform under structured evaluation conditions. Your result has been recorded and is now part of your OriginBI assessment profile.`;

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Certificate of Assessment � OriginBI</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body  { margin:0; padding:0; background-color:#E9ECEF; font-family:Tahoma,Arial,sans-serif; }
    .wrapper    { width:100%; table-layout:fixed; background-color:#E9ECEF; }
    .main-table { width:100%; max-width:600px; margin:0 auto; background-color:#E9ECEF; border-spacing:0; color:#000000; font-family:Tahoma,Arial,sans-serif; }
    @media screen and (max-width:600px) {
      .header-title  { font-size:20px !important; padding:24px 16px 12px !important; }
      .content-pad   { padding:24px !important; }
    }
    @media (prefers-color-scheme:dark) {
      body,.wrapper,.main-table { background-color:#121212 !important; }
      h1,div,td,p,span,strong   { color:#ffffff !important; }
      td[style*="color:#707070"] { color:#aaaaaa !important; }
    }
    [data-ogsc] h1,[data-ogsc] div,[data-ogsc] td { color:#ffffff !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#E9ECEF;font-family:Tahoma,Arial,sans-serif;">
<!-- Hidden preheader: controls Gmail/Outlook preview snippet -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#E9ECEF;line-height:1px;">
  Your ${assessmentTitle} certificate is ready. Score: ${overallScorePercent}% | Certificate ID: ${certificateId}
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>
<center class="wrapper">
  <table class="main-table" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:600px;width:100%;">

    <!-- -- HEADER -- -->
    <tr>
      <td style="padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:36px 0 0 36px;vertical-align:top;">
              <img src="${assets.logo}" alt="OriginBI" width="140" style="display:block;border:0;" />
            </td>
            <td style="width:56px;"></td>
          </tr>
          <tr>
            <td colspan="2" style="padding:10px 0 0 36px;">
              <div style="font-size:11px;font-weight:700;color:#150089;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Certificate of Assessment</div>
              <h1 class="header-title" style="font-family:Tahoma,Arial,sans-serif;font-weight:700;font-size:24px;line-height:130%;color:#000000;margin:0 0 24px 0;">${assessmentTitle}</h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- -- CARD -- -->
    <tr>
      <td style="padding:0 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-top:4px solid #150089;">
          <tr>
            <td class="content-pad" style="padding:36px;">

              <!-- Greeting -->
              <div style="font-size:16px;color:#000000;margin-bottom:20px;font-weight:400;">
                Dear <strong style="font-weight:700;">${name}</strong>,
              </div>

              <!-- Completion headline -->
              <div style="font-size:18px;font-weight:700;color:#150089;margin-bottom:12px;line-height:1.3;">
                You have successfully completed the ${assessmentTitle}
              </div>

              <!-- Professional body paragraph -->
              <div style="font-size:14px;line-height:1.75;color:#333333;margin-bottom:28px;padding:16px 20px;background:#f8f9fa;border-left:4px solid #150089;border-radius:0 6px 6px 0;">
                ${completionBody}
              </div>

              <!-- Score + Grade -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td width="48%" style="background:#f8f9fa;border:1px solid #e2e8f0;border-radius:8px;padding:18px 12px;text-align:center;vertical-align:top;">
                    <div style="font-size:11px;font-weight:700;color:#707070;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;">Your Score</div>
                    <div style="font-size:38px;font-weight:800;color:${scoreColor};line-height:1;">${overallScorePercent}%</div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:#f8f9fa;border:1px solid #e2e8f0;border-radius:8px;padding:18px 12px;text-align:center;vertical-align:top;">
                    <div style="font-size:11px;font-weight:700;color:#707070;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;">Grade</div>
                    <div style="font-size:38px;font-weight:800;color:#150089;line-height:1;">${grade}</div>
                    <div style="font-size:12px;color:#707070;margin-top:5px;">${gradeLabel}</div>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="border-top:1px solid #e2e8f0;margin-bottom:24px;"></div>

              <!-- Certificate details -->
              <div style="font-size:12px;font-weight:700;color:#150089;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">Certificate Details</div>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
                <tr>
                  <td style="font-size:13px;color:#707070;padding:11px 16px;width:38%;border-bottom:1px solid #e2e8f0;background:#fafafa;">Assessment</td>
                  <td style="font-size:13px;color:#000000;padding:11px 16px;font-weight:600;border-bottom:1px solid #e2e8f0;">${assessmentTitle}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#707070;padding:11px 16px;border-bottom:1px solid #e2e8f0;background:#fafafa;">Module</td>
                  <td style="font-size:13px;color:#000000;padding:11px 16px;border-bottom:1px solid #e2e8f0;">${moduleLabel}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#707070;padding:11px 16px;border-bottom:1px solid #e2e8f0;background:#fafafa;">Certificate ID</td>
                  <td style="font-size:13px;color:#000000;padding:11px 16px;font-family:monospace;font-weight:700;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">${certificateId}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#707070;padding:11px 16px;background:#fafafa;">Completed On</td>
                  <td style="font-size:13px;color:#000000;padding:11px 16px;">${formattedDate}</td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="margin-bottom:20px;text-align:center;">
                <a href="${verifyUrl}"
                   style="display:inline-block;background-color:#150089;color:#ffffff;padding:15px 36px;border-radius:5px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.3px;">
                  Verify Certificate
                </a>
              </div>



              <!-- Divider -->
              <div style="border-top:1px solid #e2e8f0;margin-bottom:20px;"></div>

              <!-- Sign-off -->
              <div style="font-size:14px;color:#000000;line-height:1.6;">
                We wish you continued success in your career journey.<br /><br />
                Warm regards,<br />
                <strong style="font-weight:700;">OriginBI Technical Assessment Team</strong>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- -- FOOTER -- -->
    <tr>
      <td style="text-align:left;padding:28px 20px 0 20px;">
        <div style="font-size:12px;color:#808080;margin-bottom:8px;">
          &copy; 2024-${year}. Origin BI | All Rights Reserved
        </div>
        <div style="font-size:12px;">
          <a href="${frontendUrl}/privacy" style="color:#150089;text-decoration:none;">Privacy Policy</a>
          <span style="color:#000000;"> | </span>
          <a href="${frontendUrl}/terms" style="color:#150089;text-decoration:none;">Terms &amp; Conditions</a>
        </div>
        <img src="${assets.footer}" alt="" draggable="false"
             style="width:100%;height:auto;display:block;margin-top:18px;border:0;pointer-events:none;user-select:none;" />
      </td>
    </tr>

  </table>
</center>
</body>
</html>`;
};

// -- Per-assessment professional completion paragraphs -------------------------
// Each is tuned to the domain of the assessment � used as the `domainPhrase` arg.
export const getTechCertificateDomainPhrase = (
  assessmentModule: string,
  assessmentTitle: string,
  overallScorePercent: number,
): string => {
  const performance =
    overallScorePercent >= 70
      ? 'a strong performance'
      : overallScorePercent >= 50
        ? 'a solid performance'
        : 'a commendable effort';

  const phrases: Record<string, string> = {
    aptitude: `You demonstrated ${performance} in the ${assessmentTitle}, showcasing your logical reasoning, quantitative aptitude, and analytical thinking. These core competencies are highly valued across technical and professional roles, and your result reflects your readiness to tackle complex problem-solving scenarios.`,

    grammar: `You demonstrated ${performance} in the ${assessmentTitle}, reflecting your command of professional communication, written expression, and language proficiency. Strong communication skills are a cornerstone of workplace effectiveness, and this assessment validates your ability to articulate ideas clearly and professionally.`,

    communication: `You demonstrated ${performance} in the ${assessmentTitle}, reflecting your command of professional communication, written expression, and language proficiency. Strong communication skills are a cornerstone of workplace effectiveness, and this assessment validates your ability to articulate ideas clearly and professionally.`,

    mnc: `You demonstrated ${performance} in the ${assessmentTitle}, highlighting your aptitude for the structured, fast-paced environment of multinational organisations. This assessment evaluated your quantitative reasoning, logical thinking, and professional readiness � qualities that are essential for thriving in global corporate settings.`,

    role: `You demonstrated ${performance} in the ${assessmentTitle}, showcasing your situational judgment, role-based decision-making, and professional scenario analysis. This assessment reflects your ability to navigate real-world workplace challenges and align your responses with industry-standard professional expectations.`,

    coding: `You demonstrated ${performance} in the ${assessmentTitle}, validating your programming logic, problem-solving approach, and technical implementation skills. This assessment reflects your ability to write structured, efficient code and apply computational thinking to real-world development challenges.`,
  };

  if (assessmentModule.startsWith('coding:')) {
    const lang = assessmentModule.slice('coding:'.length);
    const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
    return `You demonstrated ${performance} in the ${assessmentTitle}, validating your ${langName} programming skills, algorithmic thinking, and code quality. This assessment reflects your ability to design and implement solutions using ${langName} in a structured, time-bound environment.`;
  }

  return (
    phrases[assessmentModule] ||
    `You demonstrated ${performance} in the ${assessmentTitle}. This certificate recognises your commitment to professional development and your ability to perform under structured evaluation conditions. Your result is now part of your OriginBI assessment profile.`
  );
};
