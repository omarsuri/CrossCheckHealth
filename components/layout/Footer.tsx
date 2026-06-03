import React from "react";

export const Footer = ({ navigate }) => (
  <footer className="mesh-deep text-cream/80 mt-20 relative overflow-hidden noise">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <span>
              <span className="serif text-2xl font-bold text-cream tracking-tight">CrossCheck</span>
              <span className="serif text-2xl font-bold text-aqua tracking-tight italic">Health</span>
            </span>
          </div>
          <p className="text-sm text-cream/60 leading-relaxed">Your personal health check hub for smarter decisions and family wellbeing.</p>
        </div>
        <div>
          <h4 className="font-semibold text-cream mb-4">Tools</h4>
          <ul className="space-y-2 text-sm">
            <li><button onClick={() => navigate("/tools/heart-health")} className="hover:text-white transition-colors">Heart Health</button></li>
            <li><button onClick={() => navigate("/tools/body-fat")} className="hover:text-white transition-colors">Body Fat</button></li>
            <li><button onClick={() => navigate("/tools/products")} className="hover:text-white transition-colors">SwasthyaSathi</button></li>
            <li><button onClick={() => navigate("/tools/raktasetu")} className="hover:text-white transition-colors">RaktaSetu</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-cream mb-4">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><button onClick={() => navigate("/support")} className="hover:text-white transition-colors">Support</button></li>
            <li><button onClick={() => navigate("/privacy")} className="hover:text-white transition-colors">Privacy</button></li>
            <li><button onClick={() => navigate("/disclaimer")} className="hover:text-white transition-colors">Disclaimer</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-cream mb-4">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li><button onClick={() => navigate("/privacy")} className="hover:text-white transition-colors">Privacy Policy</button></li>
            <li><button onClick={() => navigate("/terms")} className="hover:text-white transition-colors">Terms of Use</button></li>
            <li><button onClick={() => navigate("/disclaimer")} className="hover:text-white transition-colors">Medical Disclaimer</button></li>
            <li><button onClick={() => navigate("/refunds")} className="hover:text-white transition-colors">Refunds</button></li>
            <li><button onClick={() => navigate("/grievance")} className="hover:text-white transition-colors">Grievance Redressal</button></li>
            <li><button onClick={() => navigate("/cookies")} className="hover:text-white transition-colors">Cookie Policy</button></li>
            <li><button onClick={() => navigate("/dpa")} className="hover:text-white transition-colors">Data Processing Addendum</button></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 mt-10 pt-6 text-center text-sm text-white/40">
        <p>&copy; 2026 CrossCheckHealth. Health awareness only. Not a medical diagnosis.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
