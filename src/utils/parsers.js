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
 * The ERP renders fields as: <label>Field Name</label> + <input value="...">
 * inside column div wrappers.
 */
export function parseProfile(html) {
  if (isLoginPage(html)) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const { name, rollNo } = parseStudentInfo(html);

  // Walk up from a label to find its associated input value
  function getValNear(label) {
    let el = label.parentElement;
    for (let i = 0; i < 5; i++) {
      if (!el) break;
      const inp = el.querySelector(
        'input[type="text"], input[type="email"], input[type="number"], textarea, select'
      );
      if (inp) return (inp.value || inp.textContent || '').trim();
      el = el.parentElement;
    }
    return '';
  }

  // Build a map of label text → value
  const fields = {};
  doc.querySelectorAll('label').forEach(lbl => {
    const key = lbl.textContent.trim().replace(/\s+/g, ' ').replace(/[*:]+$/, '').trim();
    if (!key || key.length > 100) return;
    const val = getValNear(lbl);
    if (val) fields[key] = val;
  });

  // Gender from checked radio
  const genderRadio = doc.querySelector('input[type="radio"]:checked[value="Male"], input[type="radio"]:checked[value="Female"]');
  if (genderRadio) fields['Gender'] = genderRadio.value;

  // Category from checked radio
  for (const cat of ['OBC(NCL)', 'GEN(EWS)', 'GEN', 'SC', 'ST']) {
    if (doc.querySelector(`input[type="radio"][value="${cat}"]:checked`)) {
      fields['Category'] = cat;
      break;
    }
  }

  // Helper: case-insensitive substring match over field keys
  function pick(...substrings) {
    for (const sub of substrings) {
      const hit = Object.entries(fields).find(([k]) => k.toLowerCase().includes(sub.toLowerCase()));
      if (hit && hit[1]) return hit[1];
    }
    return '';
  }

  return {
    name: name || pick('name'),
    rollNo,
    email: pick('email address', 'email'),
    phone: pick('personal contact', 'mobile', 'contact number'),
    gender: fields['Gender'] || pick('gender'),
    dob: pick('date of birth', 'birth', 'dob'),
    blood: pick('blood'),
    aadhar: pick('aadhaar', 'aadhar'),
    father: pick("father"),
    mother: pick("mother"),
    parentPhone: pick("parents's contact", "parent contact"),
    parentEmail: pick("parents's email", "parent email"),
    category: fields['Category'] || pick('category'),
    rawFields: fields,
  };
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
