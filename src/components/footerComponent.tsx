import React from 'react';
import { MapPin, Mail } from 'lucide-react';
import logo from '../assets/logo/PONOS_compass_1024x1024.png';

export const Footer: React.FC = () => {
  return (
    // Reduceret polstring fra pt-12/pb-6 til pt-6/pb-4 for at gøre footeren mere kompakt
    <footer className="w-full bg-[#0B132A] text-slate-300 pt-6 pb-4 px-6 border-t border-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Kolonne 1: Logo & Beskrivelse */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <img src={logo} alt="PONOS Logo" className="w-10 h-10 object-contain" />
            <span className="text-xl font-serif tracking-[0.2em] font-semibold text-slate-100">
              PONOS
            </span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
            Vi skaber overblik, samarbejde og bæredygtige resultater – sammen.
          </p>
        </div>

        {/* Kolonne 2: Navigation */}
        <div>
          <h3 className="text-xs font-semibold text-white mb-2 uppercase tracking-wider">Navigation</h3>
          <ul className="space-y-1 text-[11px] text-slate-400">
            <li><a href="#" className="hover:text-white transition-colors">Dashboard</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Opgaver</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Statistikker</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Om os</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Notifikationer</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Bruger</a></li>
          </ul>
        </div>

        {/* Kolonne 3: Platform */}
        <div>
          <h3 className="text-xs font-semibold text-white mb-2 uppercase tracking-wider">Platform</h3>
          <ul className="space-y-1 text-[11px] text-slate-400">
            <li><a href="#" className="hover:text-white transition-colors">Hjælp & support</a></li>
          </ul>
        </div>

        {/* Kolonne 4: Kontakt */}
        <div>
          <h3 className="text-xs font-semibold text-white mb-2 uppercase tracking-wider">Kontakt</h3>
          <ul className="space-y-1.5 text-[11px] text-slate-400">
            <li className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Roskilde, Danmark</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <a href="mailto:info@ponos.dk" className="hover:text-white transition-colors">
                info@ponos.dk
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="border-t border-slate-800/60 pt-3 text-center text-[10px] text-slate-500">
        © {new Date().getFullYear()} Ponos. Alle rettigheder forbeholdes.
      </div>
    </footer>
  );
};