import React from "react";
import { Icon } from "./Icon";

export const Disclaimer = ({ type = "general", className = "" }) => {
  const styles = {
    general: "bg-blue-50 border-l-4 border-blue-400 text-blue-800",
    emergency: "bg-red-50 border-l-4 border-red-500 text-red-800",
    affiliate: "bg-gray-50 border-l-4 border-gray-400 text-gray-600 text-sm",
    consent: "bg-teal-50 border-l-4 border-teal-400 text-teal-800",
  };
  const texts = {
    general: "CrossCheckHealth provides health awareness insights only. It is not a medical diagnosis and does not replace professional medical advice.",
    emergency: "If you are experiencing chest pain, severe breathlessness, fainting, or sudden weakness, seek urgent medical help immediately.",
    affiliate: "Some product or partner links may be affiliate links. We may earn a commission at no extra cost to you.",
    consent: "Parent assessment results are shared only after the invited person agrees.",
  };
  return (
    <div className={`${styles[type]} p-4 rounded-r-lg mb-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Icon name={type === "emergency" ? "alertTriangle" : "info"} size={18} className="mt-0.5 flex-shrink-0" />
        <p className="text-sm leading-relaxed">{texts[type]}</p>
      </div>
    </div>
  );
};

export default Disclaimer;
