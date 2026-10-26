/**
 * Admin Navigation Loader
 * Loads the shared admin navigation bar with dropdown categories.
 * Also loads quiz sub-navigation when on quiz pages.
 * 
 * Usage: Add this to any admin page:
 *   <div id="admin-nav-container"></div>
 *   <script src="../shared/js/admin-nav.js"></script>
 */

(function() {
    // Determine current page and depth
    const pathParts = window.location.pathname.split('/');
    const currentPage = pathParts.pop().replace('.html', '') || 'index';
    const isGamePage = pathParts.includes('games');
    const isQuizPage = pathParts.includes('quiz');
    const isModeratingPage = pathParts.includes('moderating');
    const isSimPage = pathParts.includes('simulation') && pathParts.includes('frontend');
    const isSimV2Page = pathParts.includes('simulation_v2');

    // Universal contexts — pages outside admin_pages that now share this nav:
    //   tool pages under apps/** (excluding the legacy simulation frontend, which
    //   has its own block below), the textbook reader, and public/marketing pages.
    //   simulation_v2 pages use NAV_TO_ROOT like any other nested page.
    const isToolPage = pathParts.includes('apps') && !isSimPage && !isSimV2Page;
    const isTextbookPage = pathParts.includes('textbook');
    const isAdminPagesPage = pathParts.includes('admin_pages');
    const isRootPage = !isAdminPagesPage && !pathParts.includes('apps') && !isTextbookPage && !pathParts.includes('old_site');

    // Robust relative path from the current file up to the site root — tolerant of
    // any base path (Netlify root, a sub-path, or Live Server). Counts directory
    // segments below the first recognized top-level folder.
    const NAV_TO_ROOT = (function () {
        const segs = window.location.pathname.split('/').filter(Boolean);
        const anchors = ['apps', 'admin_pages', 'textbook', 'old_site'];
        let anchorIdx = -1;
        for (let i = 0; i < segs.length; i++) { if (anchors.indexOf(segs[i]) !== -1) { anchorIdx = i; break; } }
        const dirsBelowRoot = anchorIdx === -1 ? 0 : (segs.length - 1 - anchorIdx);
        return '../'.repeat(dirsBelowRoot);
    })();
    // Prefix from the current page to the admin_pages/ folder, where most nav links live.
    const NAV_TO_ADMIN = NAV_TO_ROOT + 'admin_pages/';

    // Determine path to shared component (allow override via global)
    const ADMIN_NAV_COMPONENT_PATH = window.ADMIN_NAV_COMPONENT_PATH || null;
    let sharedBase = ADMIN_NAV_COMPONENT_PATH ? '' : '../shared/';
    if (!ADMIN_NAV_COMPONENT_PATH && (isGamePage || isQuizPage || isModeratingPage)) {
        sharedBase = '../../shared/';
    }
    if (!ADMIN_NAV_COMPONENT_PATH && (isSimPage || isSimV2Page)) {
        sharedBase = '../../../shared/';
    }
    if (!ADMIN_NAV_COMPONENT_PATH && (isToolPage || isTextbookPage || isRootPage)) {
        sharedBase = NAV_TO_ROOT + 'shared/';
    }
    const navPath = ADMIN_NAV_COMPONENT_PATH || (sharedBase + 'components/admin-nav.html');
    
    // Load the nav HTML
    fetch(navPath)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load admin nav');
            return response.text();
        })
        .then(html => {
            const container = document.getElementById('admin-nav-container');
            if (!container) return;
            
            container.innerHTML = html;
            
            // Check user permissions and hide role-specific dropdowns
            const isStaff = localStorage.getItem('is_staff') === 'true';
            const isSuperuser = localStorage.getItem('is_superuser') === 'true';
            
            if (!isStaff) {
                container.querySelectorAll('[data-role="staff"]').forEach(el => {
                    el.style.display = 'none';
                });
            }
            
            if (!isSuperuser) {
                container.querySelectorAll('[data-role="superuser"]').forEach(el => {
                    el.style.display = 'none';
                });
            }

            // Guest (logged-out) mode: hide course/role menus + bell, and swap the
            // profile dropdown for Log in / Create Account. Lets the same nav serve
            // public/marketing and tool pages without showing a fake profile.
            const navToken = localStorage.getItem('auth_token');
            if (!navToken) {
                container.querySelectorAll('.nav-audience-student, .nav-audience-instructor, .nav-audience-admin, [data-role]')
                    .forEach(el => { el.style.display = 'none'; });
                const bellMount = container.querySelector('#nav-bell-mount');
                if (bellMount) bellMount.style.display = 'none';
                const profileDropdown = container.querySelector('#nav-profile-dropdown');
                if (profileDropdown) {
                    profileDropdown.classList.remove('nav-dropdown');
                    profileDropdown.classList.add('nav-guest-auth');
                    const next = encodeURIComponent(window.location.href);
                    profileDropdown.innerHTML =
                        `<a class="nav-guest-login" href="${NAV_TO_ADMIN}login.html?next=${next}">Log in</a>` +
                        `<a class="nav-guest-register" href="${NAV_TO_ADMIN}register.html?next=${next}">Create Account</a>`;
                }
            }

            // Show pulsing dot on "Getting Started" for new instructors
            if (isStaff) {
                addOnboardingNavIndicator(container);
            }

            // An instructor with no course of their own yet is cued to build one with
            // the Course Cartridge Wizard (shared/js/first-course-cue.js).
            if (isStaff && navToken) {
                ensureCourseContext(sharedBase).then(function () {
                    if (document.querySelector('script[data-mkt-first-course-cue]')) return;
                    const s = document.createElement('script');
                    s.src = sharedBase + 'js/first-course-cue.js';
                    s.setAttribute('data-mkt-first-course-cue', '1');
                    document.head.appendChild(s);
                });
            }

            // The profile menu shows "Signed in", never the username (register D22,
            // 2026-10-25): students screenshot tool pages into graded PDFs, and a
            // name printed here ends up inside those images where redaction cannot
            // reach it. The username itself is still available on the profile page.
            const profileNameEl = container.querySelector('#nav-profile-name');
            if (profileNameEl) {
                profileNameEl.textContent = 'Signed in';
            }

            // Wire mobile hamburger toggle
            const hamburger = container.querySelector('.nav-hamburger');
            const navEl = container.querySelector('.admin-nav');
            if (hamburger && navEl) {
                hamburger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = navEl.classList.toggle('mobile-open');
                    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                });
                // Collapse mobile menu when a leaf link is clicked
                navEl.querySelectorAll('.nav-dropdown-menu a, .nav-getting-started').forEach(link => {
                    link.addEventListener('click', () => {
                        navEl.classList.remove('mobile-open');
                        hamburger.setAttribute('aria-expanded', 'false');
                    });
                });
            }
            
            // Fix links if we are in a subdirectory
            if (isGamePage || isQuizPage || isModeratingPage) {
                const links = container.querySelectorAll('a');
                links.forEach(link => {
                    // Guest login/register links are already fully pathed via
                    // NAV_TO_ADMIN — skip so they are never re-prefixed.
                    if (link.closest('.nav-guest-auth')) return;
                    const href = link.getAttribute('href');
                    if (href && !href.startsWith('http') && !href.startsWith('#')) {
                        if (isGamePage && href.startsWith('games/')) {
                            link.setAttribute('href', href.replace('games/', ''));
                        } else if (isQuizPage && href.startsWith('quiz/')) {
                            link.setAttribute('href', href.replace('quiz/', ''));
                        } else if (isModeratingPage && href.startsWith('moderating/')) {
                            link.setAttribute('href', href.replace('moderating/', ''));
                        } else {
                            link.setAttribute('href', '../' + href);
                        }
                    }
                });
                // Fix logo image src for subdirectories
                const logoImg = container.querySelector('.nav-logo-img');
                if (logoImg) {
                    const src = logoImg.getAttribute('src');
                    if (src && src.startsWith('../')) {
                        logoImg.setAttribute('src', '../' + src);
                    }
                }
            }
            
            // Fix links if we are on a simulation page (apps/simulation/frontend/)
            if (isSimPage) {
                const SIM_PREFIX = '../apps/simulation/frontend/';
                const links = container.querySelectorAll('a');
                links.forEach(link => {
                    // Guest login/register links are already fully pathed via
                    // NAV_TO_ADMIN — skip so they are never re-prefixed.
                    if (link.closest('.nav-guest-auth')) return;
                    const href = link.getAttribute('href');
                    if (!href || href.startsWith('http') || href.startsWith('#')) return;
                    if (href.startsWith(SIM_PREFIX)) {
                        // Sim-to-sim link → same folder
                        link.setAttribute('href', href.replace(SIM_PREFIX, ''));
                    } else if (href.startsWith('../')) {
                        // Root-relative link (e.g., ../index.html) → add 2 more levels
                        link.setAttribute('href', '../../' + href);
                    } else {
                        // admin_pages-relative link → full path back to admin_pages
                        link.setAttribute('href', '../../../admin_pages/' + href);
                    }
                });
                // Fix logo image src
                const logoImg = container.querySelector('.nav-logo-img');
                if (logoImg) {
                    const src = logoImg.getAttribute('src');
                    if (src && src.startsWith('../')) {
                        logoImg.setAttribute('src', '../../' + src);
                    }
                }
            }

            // Fix links for the universal contexts (tool pages, textbook, public root).
            // The component authors its links relative to admin_pages/, plus a few
            // root-relative links (../index.html, ../art_assets/...). Rewrite both so
            // the nav resolves correctly at any directory depth.
            if (isToolPage || isTextbookPage || isRootPage || isSimV2Page) {
                container.querySelectorAll('a').forEach(link => {
                    // Guest login/register links are already fully pathed via
                    // NAV_TO_ADMIN — skip so they are never re-prefixed.
                    if (link.closest('.nav-guest-auth')) return;
                    const href = link.getAttribute('href');
                    if (!href || href.startsWith('http') || href.startsWith('#')) return;
                    if (href.startsWith('../')) {
                        link.setAttribute('href', NAV_TO_ROOT + href.slice(3));
                    } else {
                        link.setAttribute('href', NAV_TO_ADMIN + href);
                    }
                });
                const logoImg = container.querySelector('.nav-logo-img');
                if (logoImg) {
                    const src = logoImg.getAttribute('src');
                    if (src && src.startsWith('../')) {
                        logoImg.setAttribute('src', NAV_TO_ROOT + src.slice(3));
                    }
                }
            }

            // Highlight current page — for quiz sub-pages, highlight Quiz Manager in main nav
            if (isQuizPage) {
                const quizLink = container.querySelector('[data-section="quiz"]');
                if (quizLink) quizLink.classList.add('active');
            } else if (isSimPage) {
                // For sim pages, highlight the active link in Simulations dropdown
                const activeLink = container.querySelector(`[data-page="${currentPage}"]`);
                if (activeLink) activeLink.classList.add('active');
            } else {
                const activeLink = container.querySelector(`[data-page="${currentPage}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
            
            // Mark parent dropdown as having an active link
            container.querySelectorAll('.nav-dropdown-menu a.active').forEach(a => {
                const dropdown = a.closest('.nav-dropdown');
                if (dropdown) dropdown.classList.add('has-active');
            });
            
            // Set up dropdown toggle behavior
            setupDropdowns(container);
            
            // Load enrolled courses into the My Courses dropdown
            loadEnrolledCourses(container, isGamePage || isQuizPage, isSimPage, sharedBase);

            // Populate the instructor "active course" switcher pill
            if (isStaff) {
                initCourseSwitcher(container, sharedBase);
            }

            // Initialize the notification bell (loads its script if needed)
            initNotificationBell(container, sharedBase);

            // Nudge unverified accounts, and show superadmins what is waiting.
            initVerifyBanner(sharedBase);
            if (isSuperuser) {
                initPendingBadge(container);
            }
            
            // If on a quiz page, also load the quiz sub-nav — but only for
            // instructors/admins. The sub-nav links (Quizzes manager, Question
            // Bank, Analytics, Back to Courses) are instructor-only pages, so a
            // student taking a quiz must not see them.
            if (isQuizPage && isStaff) {
                loadQuizSubNav(container, sharedBase, currentPage);
            } else {
                // No sub-nav — add class so CSS gives full border-radius + margin
                const navEl = container.querySelector('.admin-nav');
                if (navEl) navEl.classList.add('no-sub-nav');
            }
        })
        .catch(err => {
            console.error('Error loading admin nav:', err);
        });
    
    /**
     * Show pulsing dot on "Getting Started" nav link for new instructors
     * Uses sessionStorage cache to avoid extra API calls on every page.
     */
    function addOnboardingNavIndicator(container) {
        var link = container.querySelector('[data-page="instructor-onboarding"]');
        if (!link) return;

        // Check cache first (set by dashboard or a previous nav load)
        var cached = null;
        try {
            var raw = sessionStorage.getItem('onboarding_summary_cache');
            if (raw) {
                cached = JSON.parse(raw);
                // Cache valid for 10 minutes
                if (cached && Date.now() - cached.ts < 600000) {
                    if (cached.remaining > 0) {
                        appendBadge(link, cached);
                    }
                    return;
                }
            }
        } catch (e) {}

        // No valid cache — fetch summary
        var token = localStorage.getItem('auth_token');
        if (!token) return;
        var apiBase = window.API_BASE || 'http://localhost:8000/api';
        fetch(apiBase + '/onboarding/summary/', {
            headers: { 'Authorization': 'Token ' + token }
        })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
            if (!data || !data.overall) return;
            var ageDays = data.account_age_days;
            var remaining = data.overall.total - data.overall.completed - (data.overall.skipped || 0);
            var cacheObj = {
                ts: Date.now(), ageDays: ageDays, pct: data.overall.pct,
                remaining: remaining, completed: data.overall.completed,
                total: data.overall.total
            };
            try {
                sessionStorage.setItem('onboarding_summary_cache', JSON.stringify(cacheObj));
            } catch (e) {}
            if (remaining > 0) {
                appendBadge(link, cacheObj);
            }
        })
        .catch(function () {});

        function appendBadge(el, info) {
            if (el.querySelector('.nav-onboarding-badge')) return;
            var badge = document.createElement('span');
            badge.className = 'nav-onboarding-badge';
            var completed = info.completed || 0;
            var total = info.total || 33;
            badge.textContent = completed + '/' + total;
            badge.setAttribute('aria-label', completed + ' of ' + total + ' steps complete');
            el.appendChild(badge);
            // Also add pulsing dot for new instructors
            if (typeof info.ageDays === 'number' && info.ageDays < 14 && info.remaining > 0) {
                if (!el.querySelector('.nav-onboarding-dot')) {
                    var dot = document.createElement('span');
                    dot.className = 'nav-onboarding-dot';
                    dot.setAttribute('aria-label', 'Setup recommended');
                    el.appendChild(dot);
                }
            }
        }
    }

    /**
     * Set up dropdown toggle click behavior and close-on-outside-click
     */
    function setupDropdowns(container) {
        const toggles = container.querySelectorAll('.nav-dropdown-toggle');
        
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const group = toggle.getAttribute('data-group');
                const menu = container.querySelector(`.nav-dropdown-menu[data-group="${group}"]`);
                const isOpen = toggle.classList.contains('open');
                
                // Close all other dropdowns first
                closeAllDropdowns(container);
                
                // Toggle this one
                if (!isOpen) {
                    toggle.classList.add('open');
                    menu.classList.add('open');
                }
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-dropdown')) {
                closeAllDropdowns(container);
            }
        });
        
        // Close dropdowns on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllDropdowns(container);
            }
        });
    }
    
    function closeAllDropdowns(container) {
        container.querySelectorAll('.nav-dropdown-toggle.open').forEach(t => t.classList.remove('open'));
        container.querySelectorAll('.nav-dropdown-menu.open').forEach(m => m.classList.remove('open'));
    }

    // This nav is an IIFE; without a local copy it was resolving `escapeHtml`
    // against the page's globals, so course menus threw on pages that lack one.
    function escapeHtml(s) {
        const d = document.createElement('div');
        d.appendChild(document.createTextNode(s == null ? '' : String(s)));
        return d.innerHTML;
    }
    
    /**
     * Ensure shared/js/api-config.js has run so window.API_BASE is set. A dozen
     * pages carry this nav without including it; falling back to a hardcoded
     * localhost URL made them silently fail in production.
     */
    function ensureApiConfig(sharedBase) {
        if (window.API_BASE) return Promise.resolve();
        return new Promise(function (resolve) {
            const existing = document.querySelector('script[data-mkt-api-config]');
            if (existing) {
                existing.addEventListener('load', function () { resolve(); });
                existing.addEventListener('error', function () { resolve(); });
                return;
            }
            const s = document.createElement('script');
            s.src = sharedBase + 'js/api-config.js';
            s.setAttribute('data-mkt-api-config', '1');
            s.onload = function () { resolve(); };
            s.onerror = function () { resolve(); };
            document.head.appendChild(s);
        });
    }

    /**
     * Load enrolled courses into the "My Courses" dropdown
     */
    function loadEnrolledCourses(container, isSubfolder, isSimPage, sharedBase) {
        const menu = container.querySelector('#nav-courses-menu');
        if (!menu) return;

        const loginHref = NAV_TO_ADMIN + 'login.html?next=' + encodeURIComponent(window.location.href);

        if (!localStorage.getItem('auth_token')) {
            menu.innerHTML = '<span class="nav-dropdown-hint">Log in to see courses</span>';
            return;
        }

        let courseHomeBase = 'course-home.html';
        if (isSimPage) courseHomeBase = '../../../admin_pages/course-home.html';
        else if (isSubfolder) courseHomeBase = '../course-home.html';
        else if (isToolPage || isTextbookPage || isRootPage || isSimV2Page) courseHomeBase = NAV_TO_ADMIN + 'course-home.html';

        function fetchCourses(apiBase) {
            return fetch(`${apiBase}/student/courses/`, {
                headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}` }
            });
        }

        ensureApiConfig(sharedBase).then(function () {
            const apiBase = window.API_BASE;
            if (!apiBase) return Promise.reject(new Error('no-api-base'));

            return fetchCourses(apiBase).then(function (r) {
                // A 401 here usually means the short-lived access token aged out,
                // not that the student is signed out. Mint a fresh one and retry
                // before showing them anything alarming.
                if (r.status === 401 && localStorage.getItem('remember_validator')
                    && typeof window.tryRefreshFromRememberMe === 'function') {
                    return window.tryRefreshFromRememberMe()
                        .then(function (restored) { return restored ? fetchCourses(apiBase) : r; })
                        .catch(function () { return r; });
                }
                return r;
            });
        })
        .then(function (r) {
            if (r.status === 401) {
                menu.innerHTML = '<a href="' + loginHref + '">Session expired — log in again</a>';
                return null;
            }
            if (!r.ok) return Promise.reject(new Error('HTTP ' + r.status));
            return r.json();
        })
        .then(data => {
            if (!data) return;
            const courses = data.courses || [];
            if (courses.length === 0) {
                menu.innerHTML = '<span class="nav-dropdown-hint">No courses yet</span>';
                return;
            }
            menu.innerHTML = courses.map(c => 
                `<a href="${courseHomeBase}?course_id=${c.id}" data-course-id="${c.id}">📚 ${escapeHtml(c.name)}</a>`
            ).join('');
            
            // Highlight if currently on a course-home page for this course
            const urlParams = new URLSearchParams(window.location.search);
            const currentCourseId = urlParams.get('course_id');
            if (currentCourseId) {
                const activeLink = menu.querySelector(`[data-course-id="${currentCourseId}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                    const dropdown = activeLink.closest('.nav-dropdown');
                    if (dropdown) dropdown.classList.add('has-active');
                }
            }
        })
        .catch(() => {
            menu.innerHTML = '<span class="nav-dropdown-hint">Could not load courses</span>';
        });
    }

    /**
     * Populate and wire the instructor "active course" switcher pill.
     * Mirrors the active course tracked by shared/js/course_context.js so the
     * selection sticks as the instructor moves between admin tools. Switching
     * here persists the choice and broadcasts `mktpraxis:course-changed`, which
     * the individual tool pages listen for to refresh in place.
     */
    function initCourseSwitcher(container, sharedBase) {
        const pill = container.querySelector('#nav-course-switch');
        if (!pill) return;

        ensureCourseContext(sharedBase).then(function () {
            if (!(window.MktPraxis && MktPraxis.course)) return;
            const course = MktPraxis.course;

            course.fetchInstructorCourses().then(function (courses) {
                const nameEl = pill.querySelector('#nav-course-name');
                const menu = pill.querySelector('#nav-course-switch-menu');
                if (!nameEl || !menu) return;

                if (!courses || courses.length === 0) {
                    // No courses yet — keep the pill hidden to avoid clutter.
                    pill.style.display = 'none';
                    return;
                }

                pill.style.display = '';

                // "Override" is a superuser concept: editing a course someone else
                // owns. An ordinary instructor only ever sees other owners' courses
                // when they are demo courses, and is merely viewing those.
                let isSuperuser = false;
                try { isSuperuser = localStorage.getItem('is_superuser') === 'true'; } catch (_) { /* storage blocked */ }

                function render() {
                    const activeId = course.getActiveCourseId();
                    const active = courses.find(function (c) { return String(c.id) === String(activeId); });
                    const isOtherOwner = active && active.is_owner === false;
                    const isOverride = isSuperuser && isOtherOwner;

                    const toggleBtn = pill.querySelector('.nav-course-toggle');
                    if (toggleBtn) {
                        toggleBtn.classList.toggle('is-superuser-override', !!isOverride);
                    }

                    const labelEl = pill.querySelector('.nav-course-label');
                    if (labelEl) {
                        labelEl.textContent = isOverride ? '⚡ Override:' : (isOtherOwner ? 'Viewing:' : 'Working in:');
                    }

                    if (active) {
                        const ownerPrefix = (isOtherOwner && active.owner_name) ? `[${active.owner_name}] ` : '';
                        nameEl.textContent = ownerPrefix + active.name;
                    } else {
                        nameEl.textContent = 'Select a course';
                    }
                    nameEl.classList.toggle('is-unset', !active);

                    if (isOverride) {
                        pill.setAttribute('title', `⚠️ Superuser Override: Course "${active.name}" is owned by ${active.owner_name || 'another instructor'}.`);
                    } else if (isOtherOwner) {
                        pill.setAttribute('title', `Viewing "${active.name}", a demo course owned by ${active.owner_name || 'another instructor'}.`);
                    } else {
                        pill.setAttribute('title', active ? ('Working in ' + active.name) : 'Pick the course you want to work in');
                    }

                    function renderCourseLink(c) {
                        const isActive = String(c.id) === String(activeId);
                        const isOther = c.is_owner === false;
                        const ownerTag = (isOther && c.owner_name)
                            ? ` <span class="nav-course-owner-tag">(${escapeHtml(c.owner_name)})</span>`
                            : '';
                        return '<a href="#" class="nav-course-item' + (isActive ? ' active' : '') + (isOther && isSuperuser ? ' is-override-item' : '') +
                            '" data-course-id="' + c.id + '">' +
                            (isActive ? '✓ ' : '') + '📚 ' + escapeHtml(c.name) + ownerTag + '</a>';
                    }

                    const myCourses = courses.filter(c => c.is_owner !== false);
                    const otherCourses = courses.filter(c => c.is_owner === false);

                    let menuHtml = '<span class="nav-dropdown-hint">Switch course</span>';
                    if (otherCourses.length > 0) {
                        if (myCourses.length > 0) {
                            menuHtml += '<span class="nav-section-header" style="padding: 0.35rem 0.85rem; font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; display: block;">My Courses</span>';
                            menuHtml += myCourses.map(renderCourseLink).join('');
                            menuHtml += '<span class="nav-section-divider" style="height: 1px; background: rgba(255,255,255,0.1); margin: 0.35rem 0; display: block;"></span>';
                        }
                        menuHtml += isSuperuser
                            ? '<span class="nav-section-header" style="padding: 0.35rem 0.85rem; font-size: 0.72rem; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; display: block;">⚡ Other Instructors (Admin Override)</span>'
                            : '<span class="nav-section-header" style="padding: 0.35rem 0.85rem; font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; display: block;">Demo Courses</span>';
                        menuHtml += otherCourses.map(renderCourseLink).join('');
                    } else {
                        menuHtml += courses.map(renderCourseLink).join('');
                    }

                    menu.innerHTML = menuHtml;

                    menu.querySelectorAll('.nav-course-item').forEach(function (link) {
                        link.addEventListener('click', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            const id = parseInt(link.getAttribute('data-course-id'), 10);
                            if (String(id) === String(course.getActiveCourseId())) {
                                closeAllDropdowns(container);
                                return;
                            }
                            const picked = courses.find(function (c) { return c.id === id; });
                            // updateUrl matters: ?course_id= outranks localStorage,
                            // so without it the page keeps resolving the old course.
                            course.setActiveCourseId(id, {
                                name: picked ? picked.name : null,
                                updateUrl: true
                            });
                            closeAllDropdowns(container);
                            render();
                            // Pages that don't repaint themselves would otherwise
                            // sit there showing the previous course's data.
                            if (!course.hasLiveSubscribers || !course.hasLiveSubscribers()) {
                                window.location.reload();
                            }
                        });
                    });
                }

                // If nothing is active yet but the instructor has exactly one
                // course, adopt it silently so the pill is immediately useful.
                if (!course.getActiveCourseId() && courses.length === 1) {
                    course.setActiveCourseId(courses[0].id, { name: courses[0].name, silent: true });
                }

                render();

                // Keep the pill in sync when the active course is changed from a
                // page-level selector elsewhere on the page. Passive: repainting
                // the pill is not the page repainting its content.
                course.onChange(function () { render(); }, { passive: true });

                // Re-fetch courses when the cache is invalidated (e.g. course created/renamed)
                window.addEventListener('mktpraxis:courses-invalidated', function () {
                    course.fetchInstructorCourses({ force: true }).then(function (newCourses) {
                        courses = newCourses || [];
                        render();
                    });
                });
            }).catch(function (err) {
                console.error('Course switcher failed to render', err);
                const menu = pill.querySelector('#nav-course-switch-menu');
                if (menu) menu.innerHTML = '<span class="nav-dropdown-hint">Could not load courses</span>';
            });
        });
    }

    /**
     * Ensure shared/js/course_context.js is available, loading it on demand so
     * the switcher works even on pages that don't include it directly.
     */
    function ensureCourseContext(sharedBase) {
        if (window.MktPraxis && window.MktPraxis.course) return Promise.resolve();
        return new Promise(function (resolve) {
            const existing = document.querySelector('script[data-mkt-course-context]');
            if (existing) {
                existing.addEventListener('load', function () { resolve(); });
                existing.addEventListener('error', function () { resolve(); });
                return;
            }
            const s = document.createElement('script');
            s.src = sharedBase + 'js/course_context.js';
            s.setAttribute('data-mkt-course-context', '1');
            s.onload = function () { resolve(); };
            s.onerror = function () { resolve(); };
            document.head.appendChild(s);
        });
    }
    
    /**
     * Load the "confirm your email" banner. It decides for itself whether to
     * show, so this only has to make the script available.
     */
    function initVerifyBanner(sharedBase) {
        function go() {
            if (window.VerifyBanner && typeof window.VerifyBanner.init === 'function') {
                try { window.VerifyBanner.init(); } catch (e) { /* non-fatal */ }
            }
        }
        if (window.VerifyBanner) { go(); return; }

        if (!document.querySelector('link[data-mkt-verifybanner]')) {
            var css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = sharedBase + 'css/verify-banner.css';
            css.setAttribute('data-mkt-verifybanner', '1');
            document.head.appendChild(css);
        }

        var existing = document.querySelector('script[data-mkt-verifybanner]');
        if (existing) { existing.addEventListener('load', go); return; }
        var s = document.createElement('script');
        s.src = sharedBase + 'js/verify_banner.js';
        s.setAttribute('data-mkt-verifybanner', '1');
        s.onload = go;
        s.onerror = function () { /* banner just won't appear */ };
        document.head.appendChild(s);
    }

    /**
     * Count what is waiting on a superadmin and show it on the Admin dropdown.
     *
     * Cached for the page load only. This is a prompt to go and look, not a
     * live figure, and it must never be the reason a nav bar is slow — every
     * failure path here leaves the nav exactly as it was.
     */
    function initPendingBadge(container) {
        var toggle = container.querySelector('.nav-dropdown-toggle[data-group="admin"]');
        if (!toggle || !window.API_BASE) return;
        if (typeof window.getAuthToken !== 'function' || !window.getAuthToken()) return;

        fetch(window.API_BASE + '/admin/pending-items/', {
            headers: { 'Authorization': 'Token ' + window.getAuthToken() }
        })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data) return;
                // Only things a person must ACT on. Signup counts are context,
                // and a badge that is never zero stops being read.
                var count = (data.trial_requests || 0)
                    + (data.student_requests || 0)
                    + (data.premium_expiring_14d || 0);
                if (count <= 0) return;

                var badge = document.createElement('span');
                badge.className = 'nav-pending-badge';
                badge.textContent = count > 9 ? '9+' : String(count);
                badge.title = count + ' item(s) waiting on you';
                toggle.insertBefore(badge, toggle.querySelector('.dropdown-arrow'));
            })
            .catch(function () { /* nav must never break over a count */ });
    }

    /**
     * Ensure user_notifications.js is loaded, then initialize the nav bell.
     * The bell self-skips for signed-out users and when there's no mount.
     */
    function initNotificationBell(container, sharedBase) {        function go() {
            if (window.UserNotifications && typeof window.UserNotifications.initBell === 'function') {
                try { window.UserNotifications.initBell(container); } catch (e) { /* non-fatal */ }
            }
        }
        if (window.UserNotifications && window.UserNotifications.initBell) { go(); return; }
        // Load the shared module once, then init.
        var existing = document.querySelector('script[data-mkt-usernotifs]');
        if (existing) { existing.addEventListener('load', go); return; }
        var s = document.createElement('script');
        s.src = sharedBase + 'js/user_notifications.js';
        s.setAttribute('data-mkt-usernotifs', '1');
        s.onload = go;
        s.onerror = function () { /* bell just won't appear */ };
        document.head.appendChild(s);
    }

    /**
     * Load the quiz sub-navigation bar after the main nav
     */
    function loadQuizSubNav(container, sharedBase, currentPage) {
        const subNavPath = sharedBase + 'components/quiz-sub-nav.html';
        
        fetch(subNavPath)
            .then(response => {
                if (!response.ok) throw new Error('Failed to load quiz sub-nav');
                return response.text();
            })
            .then(html => {
                // Insert sub-nav after main nav
                const subNavWrapper = document.createElement('div');
                subNavWrapper.id = 'quiz-sub-nav-container';
                subNavWrapper.innerHTML = html;
                container.appendChild(subNavWrapper.firstElementChild);
                
                // Highlight the active sub-nav tab
                const activeTab = container.querySelector(`.quiz-sub-nav [data-page="${currentPage}"]`);
                if (activeTab) activeTab.classList.add('active');
            })
            .catch(err => {
                console.error('Error loading quiz sub-nav:', err);
                // Fallback — give main nav full rounding
                const navEl = container.querySelector('.admin-nav');
                if (navEl) navEl.classList.add('no-sub-nav');
            });
    }
})();

/**
 * Logout handler - delegates to canonical logout() in auth_tracking.js
 * so the server-side token is revoked. Falls back to local-only clear if
 * auth_tracking.js is not loaded on the current page.
 */
function handleLogout() {
    if (typeof logout === 'function') {
        logout();
        return;
    }
    // Fallback: legacy behavior (local-only clear + redirect)
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    localStorage.removeItem('is_staff');
    localStorage.removeItem('is_superuser');
    sessionStorage.clear();
    
    const path = window.location.pathname;
    const isSubfolder = path.includes('/games/') || path.includes('/quiz/') || path.includes('/moderating/');
    const isSimPage = path.includes('/simulation/') && path.includes('/frontend/');
    if (isSimPage) {
        window.location.href = '../../../admin_pages/login.html';
    } else {
        window.location.href = isSubfolder ? '../login.html' : 'login.html';
    }
}
