import React from "react";
import { base44 } from "@/api/base44Client";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  async componentDidCatch(error, info) {
    this.setState({ hasError: true, errorInfo: info });
    
    try {
      const url = window.location.href;
      
      // Usar a nova função de registro inteligente com análise automática
      await base44.functions.invoke('registerAndAnalyzeError', {
        message: String(error?.message || error),
        stack: String(error?.stack || ""),
        source: "errorboundary",
        url,
        user_agent: navigator.userAgent,
        component: this.props.currentPageName || "unknown",
        severity: "critical", // Erros de boundary são sempre críticos (tela branca)
        extra: { 
          componentStack: info?.componentStack || "",
          errorName: error?.name || "Error",
          reactVersion: React.version
        }
      });
    } catch (_) {
      // Fallback: registrar diretamente se a função falhar
      try {
        await base44.entities.ErrorLog.create({
          message: String(error?.message || error),
          stack: String(error?.stack || ""),
          source: "errorboundary",
          url: window.location.href,
          user_agent: navigator.userAgent,
          component: this.props.currentPageName || "unknown",
          severity: "critical",
          status: "novo",
          last_seen: new Date().toISOString(),
          extra: JSON.stringify({ componentStack: info?.componentStack || "" })
        });
      } catch (e) {
        console.error("Falha ao registrar erro:", e);
      }
    }
  }

  render() {
    return this.props.children;
  }
}