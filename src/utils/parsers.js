/**
 * ERP HTML Parsers - based on real rgipt_course.php and my-profile.php HTML structure
 *
 * Key ERP pages:
 *  - my-profile.php       → student name, roll no, profile details
 *  - rgipt_course.php     → course list (code, title) + attendance links
 */

const ERP_BASE = 'https://rgipterp.com/erp/bsstums/';

/** Check if a fetched HTML page is actually the login page (session expired) */
export function isLoginPage(html) {
  return html.includes('name="roll_email"') || html.includes('name="verif_box"');
}

/**
 * Parse student name and roll number from any ERP page (all pages have the banner).
 * The ERP renders:
 *   <h4 class="tp-instructor-title">Aman Singh</h4>
 *   <span> Roll no. 25CE3009</span>
 */
export function parseStudentInfo(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const nameEl = doc.querySelector('.tp-instructor-title');
  const name = nameEl ? nameEl.textContent.trim() : 'Student';

  // The roll no is in the first span inside .tp-instructor-rate
  const rateDiv = doc.querySelector('.tp-instructor-rate');
  let rollNo = '';
  if (rateDiv) {
    const spans = rateDiv.querySelectorAll('span');
    spans.forEach(s => {
      const t = s.textContent.trim();
      if (t.toLowerCase().includes('roll')) {
        rollNo = t.replace(/roll no\.\s*/i, '').trim();
      }
    });
  }

  return { name, rollNo };
}

/**
 * Parse the profile page (my-profile.php) for detailed info.
 * Returns all table rows as key-value pairs, plus name/rollNo.
 */
export function parseProfile(html) {
  if (isLoginPage(html)) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const { name, rollNo } = parseStudentInfo(html);

  // Collect all table rows as key-value details
  const details = [];
  const rows = doc.querySelectorAll('table tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td, th');
    if (cells.length >= 2) {
      const key = cells[0].textContent.trim();
      const val = cells[1].textContent.trim();
      if (key && val && key.length < 60) {
        details.push({ key, value: val });
      }
    }
  });

  // Try extracting specific fields
  const semester = details.find(d => /sem(ester)?/i.test(d.key))?.value || '';
  const programme = details.find(d => /prog(ram(me)?)?/i.test(d.key))?.value || '';
  const branch = details.find(d => /branch|dept/i.test(d.key))?.value || '';
  const batch = details.find(d => /batch/i.test(d.key))?.value || '';
  const email = details.find(d => /email/i.test(d.key))?.value || '';

  return { name, rollNo, semester, programme, branch, batch, email, details };
}

/**
 * Parse rgipt_course.php for the list of enrolled courses.
 * ERP table:
 *   <tr><td>CH111(C)</td><td>Chemical Engineering Practices</td><td><a href="...">Quiz Attendance</a></td></tr>
 */
export function parseCourses(html) {
  if (isLoginPage(html)) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const { name, rollNo } = parseStudentInfo(html);

  const courses = [];
  const rows = doc.querySelectorAll('table tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 2) {
      const code = cells[0].textContent.trim();
      const title = cells[1].textContent.trim();
      // Attendance link if present (3rd cell)
      const attLink = cells[2] ? cells[2].querySelector('a')?.getAttribute('href') || '' : '';
      const subCode = attLink.match(/sub_code=([^&]+)/)?.[1] || '';
      // Only include rows that look like real course codes: e.g. CH111(C), CS101, MA124
      const isCourseCode = /^[A-Z]{2,4}\d{3}/i.test(code);
      if (isCourseCode && title) {
        courses.push({ code, title, subCode, attLink });
      }
    }
  });

  // Get semester from the h2 title: "My Courses (Sem: 2) & Quiz Attendance"
  const h2 = doc.querySelector('h2.tp-dashboard-title');
  const semMatch = h2?.textContent.match(/Sem:\s*(\d+)/i);
  const semester = semMatch ? semMatch[1] : '';

  return { name, rollNo, semester, courses };
}

/**
 * Parse rgipt_course.php for attendance — same page as courses.
 * Since attendance detail pages (attendance-report.php?sub_code=...) require individual
 * fetches per course, we return the course list with attendance links so the
 * AttendancePage can display them as a list of accessible courses.
 */
export function parseAttendance(html) {
  if (isLoginPage(html)) return null;
  const result = parseCourses(html);
  if (!result) return null;
  return {
    name: result.name,
    rollNo: result.rollNo,
    semester: result.semester,
    courses: result.courses, // each has { code, title, subCode, attLink }
  };
}
