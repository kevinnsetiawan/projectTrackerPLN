<!DOCTYPE html>
<html lang="id" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>@yield('title', 'Dashboard') | PLN Pro-Track</title>

    <!-- Google Fonts: Plus Jakarta Sans -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        pln: {
                            // Deep navy â€” primary brand / structural
                            navy: {
                                50: '#EFF6FB',
                                100: '#D9E9F3',
                                200: '#B3D3E7',
                                300: '#86B7D6',
                                400: '#4A91BC',
                                500: '#1E6C9B',
                                600: '#0F4E73',
                                700: '#083A5C',
                                800: '#042C4A',
                                900: '#002B49',
                                DEFAULT: '#002B49',
                            },
                            // Near-black used for dark gradients / footer
                            dark: '#001A2C',
                            // Professional blue (intermediate)
                            blue: {
                                50: '#EAF6FC',
                                100: '#CDEAF8',
                                200: '#9CD5F1',
                                300: '#5EB8E6',
                                400: '#1F97CF',
                                500: '#007BAF',
                                600: '#00588A',
                                700: '#004970',
                                800: '#00385A',
                                900: '#002A45',
                                DEFAULT: '#00588A',
                            },
                            // Corporate cyan â€” primary CTAs & accents
                            cyan: {
                                50: '#E6FAFF',
                                100: '#C2F2FF',
                                200: '#8CE6FF',
                                300: '#4FD6FF',
                                400: '#1FBEF2',
                                500: '#00AEE6',
                                600: '#00A3E0',
                                700: '#007FB0',
                                800: '#006087',
                                900: '#004763',
                                DEFAULT: '#00A3E0',
                            },
                            // Light cyan tinted surface (replaces slate-50 accents)
                            lightcyan: '#E1F5FE',
                            // Corporate yellow â€” brand accent / highlights
                            yellow: {
                                50: '#FFFCEB',
                                100: '#FFF7CC',
                                200: '#FFEF99',
                                300: '#FFE566',
                                400: '#FFDD3D',
                                500: '#FFCC00',
                                600: '#E6B800',
                                700: '#CC9C00',
                                800: '#A37D00',
                                900: '#7A5C00',
                                DEFAULT: '#FFCC00',
                            },
                            gold: '#F59E0B',
                            red: {
                                50: '#FEF2F2',
                                100: '#FED7D7',
                                200: '#FCA5A5',
                                300: '#F87171',
                                400: '#EF4444',
                                500: '#DC2626',
                                600: '#B91C1C',
                                700: '#991B1B',
                                800: '#7F1D1D',
                                900: '#63171B',
                                DEFAULT: '#EF4444',
                            },
                            green: {
                                50: '#ECFDF5',
                                100: '#D1FAE5',
                                200: '#A7F3D0',
                                300: '#6EE7B7',
                                400: '#34D399',
                                500: '#10B981',
                                600: '#059669',
                                700: '#047857',
                                800: '#065F46',
                                900: '#064E3B',
                                DEFAULT: '#10B981',
                            },
                            amber: {
                                50: '#FFFBEB',
                                100: '#FEF3C7',
                                200: '#FDE68A',
                                300: '#FCD34D',
                                400: '#FBBF24',
                                500: '#F59E0B',
                                600: '#D97706',
                                700: '#B45309',
                                800: '#92400E',
                                900: '#78350F',
                                DEFAULT: '#F59E0B',
                            },
                            surface: {
                                DEFAULT: '#F4F8FB',
                                muted: '#E9F1F6',
                                strong: '#DCE8F0',
                            },
                        }
                    },
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
                    },
                    boxShadow: {
                        'pln': '0 4px 20px -2px rgba(0, 43, 73, 0.05), 0 2px 6px -1px rgba(0, 43, 73, 0.03)',
                        'pln-hover': '0 12px 28px -4px rgba(0, 43, 73, 0.10), 0 6px 12px -4px rgba(0, 43, 73, 0.06)',
                        'pln-glow': '0 0 24px rgba(0, 163, 224, 0.28)',
                        'pln-cta': '0 6px 18px -2px rgba(0, 163, 224, 0.45)',
                    },
                    backgroundImage: {
                        'pln-gradient': 'linear-gradient(160deg, #001A2C 0%, #002B49 38%, #00588A 78%, #007BAF 100%)',
                        'pln-brand': 'linear-gradient(135deg, #00A3E0 0%, #00588A 100%)',
                    },
                    animation: {
                        'fade-up': 'fadeUp 0.5s ease-out both',
                        'fade-in': 'fadeIn 0.3s ease-out both',
                    },
                    keyframes: {
                        fadeUp: {
                            '0%': { opacity: '0', transform: 'translateY(8px)' },
                            '100%': { opacity: '1', transform: 'translateY(0)' },
                        },
                        fadeIn: {
                            '0%': { opacity: '0' },
                            '100%': { opacity: '1' },
                        },
                    },
                }
            }
        }
    </script>

    <!-- Chart.js CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <!-- Leaflet GIS CSS & JS CDN -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>

    <style>
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: #002B49;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* Fixed full-viewport solid navy layer (calm, enterprise; no glow) */
        #ambientBackground {
            position: fixed;
            inset: 0;
            z-index: -1;
            pointer-events: none;
            background-color: #001A2C;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: #001A2C;
        }
        ::-webkit-scrollbar-thumb {
            background: #00588A;
            border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #94A3B8;
        }

        .pln-gradient {
            background: linear-gradient(135deg, #002B49 0%, #004573 60%, #00A3E0 100%);
        }

        .custom-gis-pin {
            background: transparent;
            border: none;
        }
        .pin-wrapper {
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .pin-core {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid #ffffff;
            z-index: 2;
        }
        .marker-blue .pin-core { background: #00A3E0; }
        .marker-red .pin-core { background: #EF4444; }
        .marker-green .pin-core { background: #10B981; }
        .marker-amber .pin-core { background: #F59E0B; }
        .pin-pulse {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            z-index: 1;
        }
        .marker-blue .pin-pulse { background: rgba(0, 163, 224, 0.4); }
        .marker-red .pin-pulse { background: rgba(239, 68, 68, 0.5); }
        .marker-green .pin-pulse { background: rgba(16, 185, 129, 0.4); }
        .marker-amber .pin-pulse { background: rgba(245, 158, 11, 0.4); }
        @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.8; }
            100% { transform: scale(2.2); opacity: 0; }
        }
    </style>
    @stack('styles')
</head>
<body class="text-slate-800 antialiased flex flex-col min-h-screen bg-pln-dark">

    <!-- Ambient Background: flat solid navy base -->
    <div id="ambientBackground" class="fixed inset-0 -z-10" aria-hidden="true"></div>

    <!-- Mobile Sidebar Backdrop Overlay -->
    <div id="mobileBackdrop" onclick="toggleSidebar()" class="fixed inset-0 bg-slate-900/70 z-40 hidden lg:hidden transition-opacity duration-300"></div>

    <!-- Sidebar Navigation -->
    <aside id="sidebar" class="w-64 text-white flex flex-col fixed inset-y-0 left-0 z-50 border-r border-white/10 transition-transform duration-300 -translate-x-full lg:translate-x-0 bg-pln-dark">
        <!-- Logo & Header -->
        <div class="h-20 flex items-center justify-between px-6 border-b border-white/10 bg-white/[0.03]">
            <a href="{{ route('dashboard') }}" class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-pln-yellow flex items-center justify-center text-pln-navy font-black">
                    <i data-lucide="zap" class="w-5 h-5 text-pln-navy fill-current"></i>
                </div>
                <div>
                    <div class="font-extrabold tracking-wider text-base text-white flex items-center gap-1">
                        PLN <span class="text-pln-cyan">PRO-TRACK</span>
                    </div>
                    <div class="text-[9px] text-slate-400 font-medium tracking-wider uppercase">Monitoring Konstruksi</div>
                </div>
            </a>
            <button onclick="toggleSidebar()" class="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            <div class="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                <span class="w-4 h-px bg-white/20"></span>Menu Utama
            </div>

            <a href="{{ route('dashboard') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors duration-150 group {{ request()->routeIs('dashboard') ? 'bg-pln-cyan text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white' }}">
                <span class="{{ request()->routeIs('dashboard') ? 'bg-white/20' : 'bg-white/5' }} w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                    <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
                </span>
                Dashboard KPI
            </a>

            <a href="{{ route('projects.index') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors duration-150 group {{ request()->routeIs('projects.*') ? 'bg-pln-cyan text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white' }}">
                <span class="{{ request()->routeIs('projects.*') ? 'bg-white/20' : 'bg-white/5' }} w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                    <i data-lucide="folder-kanban" class="w-4 h-4"></i>
                </span>
                Daftar Proyek
            </a>

            <a href="{{ route('gis.index') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors duration-150 group {{ request()->routeIs('gis.*') ? 'bg-pln-cyan text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white' }}">
                <span class="{{ request()->routeIs('gis.*') ? 'bg-white/20' : 'bg-white/5' }} w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                    <i data-lucide="map" class="w-4 h-4"></i>
                </span>
                Peta GIS Proyek
            </a>

            <a href="{{ route('kendala.index') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors duration-150 group {{ request()->routeIs('kendala.*') ? 'bg-pln-cyan text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white' }}">
                <span class="{{ request()->routeIs('kendala.*') ? 'bg-white/20' : 'bg-white/5' }} w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                    <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                </span>
                Issue & Kendala
            </a>

            <div class="pt-5 px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                <span class="w-4 h-px bg-white/20"></span>Laporan & Output
            </div>

            <a href="{{ route('reports.index') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors duration-150 group {{ request()->routeIs('reports.*') ? 'bg-pln-cyan text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white' }}">
                <span class="{{ request()->routeIs('reports.*') ? 'bg-white/20' : 'bg-white/5' }} w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                    <i data-lucide="file-text" class="w-4 h-4"></i>
                </span>
                Laporan Eksekutif
            </a>
        </nav>

        <!-- User / Unit Footer -->
        <div class="p-4 border-t border-white/10 bg-black/20">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-pln-cyan flex items-center justify-center text-white font-black text-xs border border-white/20">
                    PLN
                </div>
                <div class="overflow-hidden">
                    <div class="text-xs font-bold text-white truncate">Divisi Konstruksi (MPO)</div>
                    <div class="text-[10px] text-slate-400 truncate">PT PLN (Persero) Pusat</div>
                </div>
            </div>
        </div>
    </aside>

    <!-- Main Content Wrapper -->
    <div class="flex-1 flex flex-col lg:ml-64 min-w-0 transition-all duration-300">
        <!-- Top Header Bar -->
        <header class="sticky top-0 z-30 bg-white border-b border-pln-surface-strong">
            <div class="h-0.5 bg-pln-cyan"></div>
            <div class="h-[4.5rem] px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                <div class="flex items-center gap-3 sm:gap-4">
                    <!-- Hamburger Button for Mobile -->
                    <button onclick="toggleSidebar()" class="lg:hidden p-2 rounded-xl text-slate-600 hover:text-pln-navy hover:bg-pln-surface-muted transition focus:outline-none">
                        <i data-lucide="menu" class="w-6 h-6"></i>
                    </button>

                    <div class="border-l-2 border-pln-cyan pl-3 sm:pl-4">
                        <h1 class="text-base sm:text-lg lg:text-xl font-extrabold text-pln-navy flex items-center gap-2">
                            @yield('page-title', 'Dashboard')
                        </h1>
                        <div class="text-[11px] text-slate-400 font-medium hidden sm:block">PT PLN (Persero) â€¢ Sistem Monitoring Pekerjaan Konstruksi</div>
                    </div>
                </div>

                <div class="flex items-center gap-2 sm:gap-4">
                    <!-- Live Real-Time Clock -->
                    <div class="hidden md:flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-3.5 py-2 rounded-lg border border-pln-surface-strong">
                        <i data-lucide="clock" class="w-3.5 h-3.5 text-pln-cyan"></i>
                        <span id="liveClock">{{ date('d M Y, H:i') }} WIB</span>
                    </div>

                    <!-- Action Button -->
                    <a href="{{ route('projects.create') }}" class="inline-flex items-center gap-1.5 sm:gap-2 bg-pln-cyan hover:bg-pln-cyan-700 text-white text-xs font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg shadow-sm transition-colors">
                        <i data-lucide="plus-circle" class="w-4 h-4"></i>
                        <span>Tambah Proyek</span>
                    </a>
                </div>
            </div>
        </header>

        <!-- Flash Notifications -->
        @if(session('success'))
            <div class="mx-4 sm:mx-6 lg:mx-8 mt-6 p-4 rounded-lg bg-white border border-pln-green-200 text-pln-green-800 flex items-center justify-between shadow-sm animate-fade-in">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-pln-green-600 text-white flex items-center justify-center">
                        <i data-lucide="check" class="w-5 h-5"></i>
                    </div>
                    <span class="text-xs sm:text-sm font-semibold">{{ session('success') }}</span>
                </div>
                <button onclick="this.parentElement.remove()" class="text-pln-green-600 hover:text-pln-green-900 hover:bg-pln-green-50 p-1.5 rounded-lg transition">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        @endif

        @if(session('error'))
            <div class="mx-4 sm:mx-6 lg:mx-8 mt-6 p-4 rounded-lg bg-white border border-pln-red-200 text-pln-red-800 flex items-center justify-between shadow-sm animate-fade-in">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-pln-red-600 text-white flex items-center justify-center">
                        <i data-lucide="alert-circle" class="w-5 h-5"></i>
                    </div>
                    <span class="text-xs sm:text-sm font-semibold">{{ session('error') }}</span>
                </div>
                <button onclick="this.parentElement.remove()" class="text-pln-red-600 hover:text-pln-red-900 hover:bg-pln-red-50 p-1.5 rounded-lg transition">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        @endif

        <!-- Main Content Area -->
        <main class="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
            @yield('content')
        </main>

        <!-- Footer -->
        <footer class="px-4 sm:px-6 lg:px-8 py-4 bg-pln-dark border-t border-white/10 text-xs text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>&copy; {{ date('Y') }} PT PLN (Persero) - Sistem Informasi Pemantauan Proyek Konstruksi (PLN Pro-Track)</div>
            <div class="flex items-center gap-3">
                <span class="text-slate-400">Versi 1.0.0</span>
                <span class="text-slate-500">â€¢</span>
                <span class="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Sistem Online
                </span>
            </div>
        </footer>
    </div>

    <!-- Scripts -->
    <script>
        lucide.createIcons();

        // Responsive Sidebar Toggle
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('mobileBackdrop');
            if (sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.remove('-translate-x-full');
                backdrop.classList.remove('hidden');
            } else {
                sidebar.classList.add('-translate-x-full');
                backdrop.classList.add('hidden');
            }
        }

        // Live Clock
        function updateClock() {
            const now = new Date();
            const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
            const clockEl = document.getElementById('liveClock');
            if (clockEl) {
                clockEl.textContent = now.toLocaleDateString('id-ID', options) + ' WIB';
            }
        }
        setInterval(updateClock, 1000);
    </script>
    @stack('scripts')
</body>
</html>
