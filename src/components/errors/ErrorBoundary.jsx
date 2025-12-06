import React from "react";
import { base44 } from "@/api/base44Client";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  async componentDidCatch(error, info) {
    this.setState({ hasError: true });
    try {
      const url = window.location.href;
      await base44.entities.ErrorLog.create({
        message: String(error?.message || error),
        stack: String(error?.stack || ""),
        source: "errorboundary",
        url,
        user_agent: navigator.userAgent,
        component: this.props.currentPageName || "unknown",
        severity: "error",
        status: "novo",
        last_seen: new Date().toISOString(),
        extra: JSON.stringify({ componentStack: info?.componentStack || "" })
      });
    } catch (_) {
      // não bloquear UI por falha de log
    }
  }

  render() {
    return this.props.children;
  }
}