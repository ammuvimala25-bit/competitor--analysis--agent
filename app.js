(() => {
  "use strict";

  const form = document.querySelector("#search-form");
  const button = document.querySelector("#search-button");
  const buttonLabel = button.querySelector(".button-label");
  const resultsContent = document.querySelector("#results-content");
  const resultCount = document.querySelector("#result-count");
  const locationInput = document.querySelector("#location");
  const locationBadge = document.querySelector("#location-badge");
  const manualUrlForm = document.querySelector("#manual-url-form");
  const manualCompetitorForm = document.querySelector("#manual-competitor-form");
  const discoveredCandidates = [];
  const analysisPanel = document.querySelector("#competitor-analysis");
  const insightsPanel = document.querySelector("#insights-panel");
  const insightsOutput = document.querySelector("#insights-output");
  const dashboardRows = document.querySelector("#dashboard-rows");
  const dashboardSearch = document.querySelector("#dashboard-search");
  const dashboardFilter = document.querySelector("#dashboard-filter");
  const dashboardSort = document.querySelector("#dashboard-sort");
  const dashboardKpis = document.querySelector("#dashboard-kpis");
  const compareButton = document.querySelector("#compare-selected");
  const comparisonPanel = document.querySelector("#comparison-panel");
  const selectedCompetitors = new Set();
  const chatMessages = document.querySelector("#chat-messages");
  const chatSuggestions = document.querySelector("#chat-suggestions");
  const chatStatus = document.querySelector("#chat-status");
  const chatInput = document.querySelector("#chat-input");
  const chatForm = document.querySelector("#chat-form");
  const chatSend = document.querySelector("#chat-send");
  const chatModeNotice = document.querySelector("#chat-mode-notice");
  const chatSessionId = (() => {
    try {
      const existing = window.localStorage.getItem("marketlens-chat-session");
      if (/^[a-f0-9]{32}$/.test(existing || "")) return existing;
      const generated = window.crypto.randomUUID().replaceAll("-", "").toLowerCase();
      window.localStorage.setItem("marketlens-chat-session", generated);
      return generated;
    } catch {
      return window.crypto.randomUUID().replaceAll("-", "").toLowerCase();
    }
  })();
  const chatHeaders = { "X-Chat-Session": chatSessionId };
  let currentConversationId = null;
  let chatBusy = false;
  let retryMessage = "";
  let dashboardData = null;

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function setLoading(isLoading) {
    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);
    button.setAttribute("aria-busy", String(isLoading));
    buttonLabel.textContent = isLoading ? "Searching public sources…" : "Search competitors";
  }

  function setCount(count) {
    resultCount.hidden = false;
    resultCount.textContent = `${count} ${count === 1 ? "result" : "results"}`;
  }

  function showMessage(title, message, isError = false) {
    resultsContent.replaceChildren();
    const state = makeElement("div", "empty-state");
    if (isError) {
      state.classList.add("is-error");
      state.setAttribute("role", "alert");
    }
    const icon = makeElement("div", "empty-illustration");
    icon.setAttribute("aria-hidden", "true");
    const ring = makeElement("span", "illustration-center");
    ring.textContent = isError ? "!" : "i";
    icon.append(ring);
    state.append(icon, makeElement("h3", "", title), makeElement("p", "", message));
    resultsContent.append(state);
    setCount(0);
  }

  function safeWebUrl(value) {
    if (typeof value !== "string") return null;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  function addLink(container, label, value, extraClass = "") {
    const url = safeWebUrl(value);
    if (!url) return;
    const link = makeElement("a", `company-link ${extraClass}`.trim());
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = value;
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "↗";
    const text = makeElement("span", "company-domain", label);
    link.append(text, icon);
    container.append(link);
  }

  function renderCompanies(payload) {
    const companies = Array.isArray(payload.companies) ? payload.companies : [];
    if (companies.length === 0) {
      showMessage(
        "No public results found",
        payload.message || payload.suggested_action ||
          "No company results were returned. You can try another search or provide company website URLs manually.",
        true
      );
      return;
    }

    resultsContent.replaceChildren();
    const list = makeElement("div", "result-list");
    companies.forEach((company, index) => {
      if (!company || typeof company !== "object") return;
      const name = typeof company.company_name === "string" ? company.company_name : "";
      const website = safeWebUrl(company.website_url);
      const source = safeWebUrl(company.source_url);
      if (!name && !website && !source) return;

      const card = makeElement("article", "company-card");
      const avatar = makeElement("div", "company-avatar", name.trim().charAt(0).toUpperCase() || "?");
      avatar.setAttribute("aria-hidden", "true");
      const main = makeElement("div", "company-main");
      const titleRow = makeElement("div", "company-title-row");
      titleRow.append(makeElement("h3", "company-title", name || "Name not available in source"));
      if (company.verified !== true) {
        titleRow.append(makeElement("span", "unverified-tag", "UNVERIFIED LEAD"));
      }
      main.append(titleRow);

      if (typeof company.description === "string" && company.description.trim()) {
        main.append(makeElement("p", "company-description", company.description));
      }

      const links = makeElement("div", "company-links");
      if (website) addLink(links, "Website / result URL", website);
      if (source) {
        const sourceName = typeof company.source_title === "string" && company.source_title.trim()
          ? `Source: ${company.source_title.trim()}`
          : "View source";
        addLink(links, sourceName, source, "source-title");
      }
      if (links.childElementCount) main.append(links);

      const number = makeElement("span", "company-index", `#${String(index + 1).padStart(2, "0")}`);
      card.append(avatar, main, number);
      list.append(card);
    });

    if (list.childElementCount === 0) {
      showMessage(
        "No usable company links",
        "The response did not contain company names or public website URLs that can be displayed."
      );
      return;
    }

    const notice = makeElement(
      "div",
      "notice",
      payload.message || "These public search results are unverified leads. Confirm each company and its website using the linked source."
    );
    resultsContent.append(notice, list);
    setCount(list.childElementCount);
  }

  function renderDiscovery(payload) {
    const candidates = Array.isArray(payload.companies) ? payload.companies : [];
    if (candidates.length === 0) {
      renderCompanies(payload);
      return;
    }
    resultsContent.replaceChildren();
    resultsContent.append(makeElement("div", "notice", payload.message || "Search results are unverified leads. Review each source before approval."));
    const list = makeElement("div", "result-list");
    for (const candidate of candidates) {
      const card = makeElement("article", "company-card discovery-card");
      const name = typeof candidate.company_name === "string" && candidate.company_name.trim()
        ? candidate.company_name.trim()
        : "Name not available in source";
      const avatar = makeElement("div", "company-avatar", name.charAt(0).toUpperCase());
      avatar.setAttribute("aria-hidden", "true");
      const main = makeElement("div", "company-main");
      const titleRow = makeElement("div", "company-title-row");
      titleRow.append(makeElement("h3", "company-title", name));
      const classification = typeof candidate.classification === "string" ? candidate.classification : "Indirect";
      titleRow.append(makeElement("span", `classification-tag classification-${classification.toLowerCase()}`, classification));
      titleRow.append(makeElement("span", "unverified-tag", "UNVERIFIED LEAD"));
      main.append(titleRow);

      const scoreText = Number.isFinite(candidate.relevance_score)
        ? `${candidate.relevance_score}% relevance`
        : "Relevance unavailable: add industry and location context";
      main.append(makeElement("p", "relevance-score", scoreText));
      const explanation = makeElement("details", "relevance-details");
      explanation.append(makeElement("summary", "", "How this was classified and ranked"));
      const reasons = makeElement("ul", "relevance-reasons");
      (Array.isArray(candidate.relevance_explanation) ? candidate.relevance_explanation : []).forEach((reason) => {
        reasons.append(makeElement("li", "", reason));
      });
      explanation.append(reasons);
      main.append(explanation);

      if (typeof candidate.description === "string" && candidate.description.trim()) {
        main.append(makeElement("p", "snippet-label", "Search snippet · unverified"));
        main.append(makeElement("p", "company-description", candidate.description));
      }
      const links = makeElement("div", "company-links");
      if (candidate.website_url) addLink(links, "Website / result URL", candidate.website_url);
      if (candidate.source_url) {
        const sourceLabel = candidate.source_title === "User supplied URL" ? "User supplied URL" : "View actual source";
        addLink(links, sourceLabel, candidate.source_url, "source-title");
      }
      if (links.childElementCount) main.append(links);

      const status = candidate.approval_status || "pending";
      if (status === "pending") {
        main.append(makeDiscoveryAction("approve", candidate.candidate_id, "Approve competitor", "discovery-approve"));
        main.append(makeDiscoveryAction("reject", candidate.candidate_id, "Reject", "discovery-reject"));
      } else {
        main.append(makeElement("span", `approval-state approval-${status}`, status === "approved" ? "Approved · still unverified" : "Rejected"));
      }
      card.append(avatar, main);
      list.append(card);
    }
    resultsContent.append(list);
    renderApprovedCompetitors();
    if (dashboardData) renderDashboardKpis(dashboardData);
    setCount(candidates.length);
  }

  function renderApprovedCompetitors() {
    const approved = discoveredCandidates.filter((candidate) => candidate.approval_status === "approved");
    document.querySelector("#approved-heading").textContent = `Approved competitors (${approved.length})`;
    const approvedList = document.querySelector("#approved-list");
    approvedList.replaceChildren();
    if (approved.length === 0) {
      approvedList.append(makeElement("p", "approved-empty", "Approve candidates to add them here. Remove any before analysis."));
      return;
    }
    const list = makeElement("ul", "approved-list");
    approved.forEach((candidate) => {
      const row = makeElement("li", "approved-row");
      const label = candidate.company_name || "Name not available in source";
      row.append(makeElement("span", "", label));
      if (candidate.source_url) addLink(row, "Source", candidate.source_url);
      const view = makeElement("button", "discovery-action", "View details");
      view.type = "button";
      view.dataset.collectionAction = "view";
      view.dataset.candidateId = candidate.candidate_id || "";
      row.append(view);
      const refresh = makeElement("button", "discovery-action", "Refresh");
      refresh.type = "button";
      refresh.dataset.collectionAction = "refresh";
      refresh.dataset.candidateId = candidate.candidate_id || "";
      row.append(refresh);
      row.append(makeDiscoveryAction("remove", candidate.candidate_id, "Remove", "discovery-remove"));
      list.append(row);
    });
    approvedList.append(list);
  }

  function renderDashboardKpis(data) {
    const competitors = Array.isArray(data.competitors) ? data.competitors : [];
    const pending = discoveredCandidates.filter((candidate) => candidate.approval_status === "pending").length;
    const analyzed = competitors.filter((competitor) => Boolean(competitor.last_updated)).length;
    const coverage = competitors.length
      ? `${(competitors.reduce((total, competitor) => total + (Number.isFinite(competitor.data_completeness) ? competitor.data_completeness : 0), 0) / competitors.length).toFixed(1)}%`
      : "Unavailable";
    const values = [
      ["Candidates in workspace", String(discoveredCandidates.length)],
      ["Pending review in workspace", String(pending)],
      ["Approved competitors", String(competitors.length)],
      ["Analyzed competitors", String(analyzed)],
      ["Average evidence coverage", coverage],
    ];
    dashboardKpis.replaceChildren();
    values.forEach(([label, value]) => {
      const card = makeElement("article", "dashboard-kpi");
      card.setAttribute("aria-label", `${label}: ${value}`);
      card.append(makeElement("span", "dashboard-kpi-label", label));
      card.append(makeElement("strong", "dashboard-kpi-value", value));
      dashboardKpis.append(card);
    });
  }

  function dashboardCompetitorsForView(competitors) {
    const query = dashboardSearch.value.trim().toLocaleLowerCase();
    const status = dashboardFilter.value;
    const filtered = competitors.filter((competitor) => {
      const analyzed = Boolean(competitor.last_updated);
      if (status === "analyzed" && !analyzed) return false;
      if (status === "not-analyzed" && analyzed) return false;
      return !query || `${competitor.company_name || ""} ${competitor.website_url || ""}`.toLocaleLowerCase().includes(query);
    });
    const sort = dashboardSort.value;
    return filtered.sort((left, right) => {
      if (sort === "score" || sort === "coverage") {
        const key = sort === "score" ? "overall_score" : "data_completeness";
        const leftValue = Number.isFinite(left[key]) ? left[key] : Number.NEGATIVE_INFINITY;
        const rightValue = Number.isFinite(right[key]) ? right[key] : Number.NEGATIVE_INFINITY;
        return rightValue - leftValue || String(left.company_name || "").localeCompare(String(right.company_name || ""));
      }
      if (sort === "refreshed") {
        const leftValue = Date.parse(left.last_updated || "") || 0;
        const rightValue = Date.parse(right.last_updated || "") || 0;
        return rightValue - leftValue || String(left.company_name || "").localeCompare(String(right.company_name || ""));
      }
      return String(left.company_name || "").localeCompare(String(right.company_name || ""));
    });
  }

  function mergeDiscoveredCandidates(incoming) {
    const previousById = new Map(discoveredCandidates.map((candidate) => [candidate.candidate_id, candidate]));
    const next = incoming.map((candidate) => {
      const previous = previousById.get(candidate.candidate_id);
      return previous && previous.approval_status !== "pending"
        ? { ...candidate, approval_status: previous.approval_status }
        : candidate;
    });
    const nextIds = new Set(next.map((candidate) => candidate.candidate_id));
    discoveredCandidates
      .filter((candidate) => candidate.approval_status === "approved" && !nextIds.has(candidate.candidate_id))
      .forEach((candidate) => next.push(candidate));
    discoveredCandidates.splice(0, discoveredCandidates.length, ...next);
    discoveredCandidates.sort((a, b) => {
      const scoreA = Number.isFinite(a.relevance_score) ? a.relevance_score : -1;
      const scoreB = Number.isFinite(b.relevance_score) ? b.relevance_score : -1;
      return scoreB - scoreA;
    });
  }

  function makeDiscoveryAction(decision, candidateId, label, className) {
    const button = makeElement("button", `discovery-action ${className}`, label);
    button.type = "button";
    button.dataset.discoveryDecision = decision;
    button.dataset.candidateId = candidateId || "";
    return button;
  }

  async function submitDiscoveryDecision(candidate, decision) {
    const response = await fetch("/api/companies/discovery/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        candidate,
        decision,
        industry: document.querySelector("#industry").value.trim() || null,
        location: locationInput.value.trim() || null,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.candidate) {
      throw new Error(payload.detail || "Could not update candidate approval.");
    }
    const index = discoveredCandidates.findIndex((item) => item.candidate_id === candidate.candidate_id);
    if (index >= 0) discoveredCandidates[index] = payload.candidate;
    renderDiscovery({ companies: discoveredCandidates });
    await loadDashboard();
  }

  document.addEventListener("click", async (event) => {
    const insightsButton = event.target.closest("button[data-insights-open]");
    if (insightsButton) {
      await openCompetitorInsights(insightsButton.dataset.insightsOpen);
      return;
    }
    const comparisonInsightsButton = event.target.closest("button[data-comparison-insights]");
    if (comparisonInsightsButton) {
      await openComparisonInsights();
      return;
    }
    const generateInsightsButton = event.target.closest("button[data-insights-generate]");
    if (generateInsightsButton) {
      const ids = generateInsightsButton.dataset.candidateId
        ? [generateInsightsButton.dataset.candidateId]
        : [...selectedCompetitors];
      await requestInsights(ids, generateInsightsButton);
      return;
    }
    const chatSuggestion = event.target.closest("button[data-chat-suggestion]");
    if (chatSuggestion) {
      chatInput.value = chatSuggestion.dataset.chatSuggestion;
      chatInput.focus();
      await sendChatMessage(chatInput.value);
      return;
    }
    const chatConfirmation = event.target.closest("button[data-chat-confirm]");
    if (chatConfirmation) {
      await confirmChatAction(chatConfirmation.dataset.chatConfirm, chatConfirmation.dataset.confirmationToken, chatConfirmation);
      return;
    }
    const chatRetry = event.target.closest("button[data-chat-retry]");
    if (chatRetry && retryMessage) {
      await sendChatMessage(retryMessage);
      return;
    }
    const collectionButton = event.target.closest("button[data-collection-action]");
    if (collectionButton) {
      collectionButton.disabled = true;
      try {
        const id = encodeURIComponent(collectionButton.dataset.candidateId);
        const action = collectionButton.dataset.collectionAction;
        const response = action === "refresh"
          ? await fetch(`/api/companies/approved/${id}/refresh`, { method: "POST" })
          : await fetch(`/api/companies/approved/${id}/analysis`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || "Could not load competitor data.");
        renderAnalysis(payload.analysis, action === "refresh");
        if (action === "refresh") await loadDashboard();
      } catch (error) {
        renderAnalysisError(error instanceof Error ? error.message : "Could not load competitor data.");
      } finally {
        collectionButton.disabled = false;
      }
      return;
    }
    const button = event.target.closest("button[data-discovery-decision]");
    if (!button) return;
    const candidate = discoveredCandidates.find((item) => item.candidate_id === button.dataset.candidateId);
    if (!candidate) return;
    button.disabled = true;
    try {
      await submitDiscoveryDecision(candidate, button.dataset.discoveryDecision);
    } catch (error) {
      button.disabled = false;
      showMessage("Could not update competitor", error instanceof Error ? error.message : "Please try again.", true);
    }
  });

  function renderAnalysisError(message) {
    analysisPanel.hidden = false;
    analysisPanel.replaceChildren(makeElement("p", "notice error", message));
  }

  function renderAnalysis(analysis, refreshed) {
    analysisPanel.hidden = false;
    analysisPanel.replaceChildren();
    if (!analysis) {
      analysisPanel.append(makeElement("h3", "", "Competitor details"));
      analysisPanel.append(makeElement("p", "approved-empty", "No analysis collected yet. Use Refresh to inspect the public website."));
      return;
    }
    analysisPanel.append(makeElement("h3", "", `Competitor details · ${analysis.profile.company_name || "Unavailable"}`));
    analysisPanel.append(makeElement("p", "approved-empty", `Collection status: ${analysis.status}. Last updated: ${analysis.last_updated || "Unavailable"}. Profile is unverified.`));
    const pageCollection = analysis.website_collection || {};
    analysisPanel.append(makeElement("p", "company-description", `Website source status: ${pageCollection.status || "not_collected"}; requested URL: ${pageCollection.requested_url || "Unavailable"}; retrieved URL: ${pageCollection.final_url || "Unavailable"}; collected at: ${pageCollection.retrieved_at || "Unavailable"}.`));
    if (pageCollection.final_url) addLink(analysisPanel, "Website source", pageCollection.final_url);
    if (pageCollection.error) analysisPanel.append(makeElement("p", "notice", pageCollection.error));
    const profile = analysis.profile || {};
    for (const label of ["company_name", "website_url", "industry", "location"]) {
      const value = profile[label] || "Unavailable";
      const p = makeElement("p", "company-description", `${label.replaceAll("_", " ")}: ${value}`);
      analysisPanel.append(p);
    }
    analysisPanel.append(makeElement("h4", "", "Website analysis"));
    const website = analysis.website_analysis || {};
    for (const field of ["title", "meta_description", "public_text_excerpt"]) {
      analysisPanel.append(makeElement("p", "company-description", `${field.replaceAll("_", " ")}: ${website[field] || "Unavailable"}`));
    }
    const metadata = website.metadata && typeof website.metadata === "object" ? website.metadata : {};
    const metadataEntries = Object.entries(metadata);
    analysisPanel.append(makeElement("h4", "", "Published page metadata"));
    if (!metadataEntries.length) analysisPanel.append(makeElement("p", "approved-empty", "No page metadata was collected from this source."));
    metadataEntries.forEach(([key, value]) => analysisPanel.append(makeElement("p", "company-description", `${key}: ${value} · source ${website.final_url || pageCollection.final_url || "Unavailable"} · retrieved ${website.retrieved_at || pageCollection.retrieved_at || "Unavailable"}`)));
    const collectedPages = Array.isArray(analysis.website_pages) ? analysis.website_pages : [];
    analysisPanel.append(makeElement("h4", "", "Additional public pages inspected"));
    if (!collectedPages.length) analysisPanel.append(makeElement("p", "approved-empty", "No same-site contact, services, about, or location pages were available to inspect."));
    collectedPages.forEach((page) => {
      analysisPanel.append(makeElement("p", "company-description", `${page.title || "Public page"}: ${page.url || "URL unavailable"} · retrieved ${page.retrieved_at || "Unavailable"}${page.error ? ` · ${page.error}` : ""}`));
      if (page.url) addLink(analysisPanel, "Collected page source", page.url);
      if (page.meta_description) analysisPanel.append(makeElement("p", "company-description", `Published description: ${page.meta_description}`));
      if (page.public_text_excerpt) analysisPanel.append(makeElement("p", "company-description", `Readable page content: ${page.public_text_excerpt}`));
      Object.entries(page.metadata || {}).forEach(([key, value]) => analysisPanel.append(makeElement("small", "", `${key}: ${value}`)));
    });
    const pagespeed = analysis.pagespeed || {};
    analysisPanel.append(makeElement("h4", "", "PageSpeed / Lighthouse collection"));
    analysisPanel.append(makeElement("p", "company-description", `Status: ${pagespeed.status || "not_collected"}; URL tested: ${pagespeed.url_tested || "Unavailable"}; retrieved: ${pagespeed.retrieved_at || "Unavailable"}.`));
    if (pagespeed.source_url) addLink(analysisPanel, "PageSpeed request source", pagespeed.source_url);
    (pagespeed.errors || []).forEach((error) => analysisPanel.append(makeElement("p", "notice", error)));
    (pagespeed.metrics || []).forEach((metric) => analysisPanel.append(makeElement("p", "company-description", `${metric.name}: ${metric.value}${metric.unit ? ` ${metric.unit}` : ""}${metric.scored === false ? " · reported, not separately scored" : ""} · retrieved ${metric.retrieved_at || "Unavailable"}`)));
    analysisPanel.append(makeElement("h4", "", "Measured metrics"));
    const metrics = Array.isArray(analysis.metrics) ? analysis.metrics : [];
    if (!metrics.length) analysisPanel.append(makeElement("p", "approved-empty", "No live numeric measurements were collected."));
    metrics.forEach((metric) => {
      analysisPanel.append(makeElement("p", "company-description", `${metric.name}: ${metric.value}${metric.unit ? ` ${metric.unit}` : ""} · ${metric.measurement_type} · ${metric.evidence_strength} evidence${metric.measured_at ? ` · measured ${metric.measured_at}` : ""}`));
      if (metric.source_url) addLink(analysisPanel, `Measurement source · retrieved ${metric.retrieved_at || "time unavailable"}`, metric.source_url);
      if (metric.limitations) analysisPanel.append(makeElement("p", "approved-empty", metric.limitations));
    });
    analysisPanel.append(makeElement("h4", "", "Available findings and sources"));
    const facts = Array.isArray(analysis.facts) ? analysis.facts : [];
    if (!facts.length) analysisPanel.append(makeElement("p", "approved-empty", "No sourced website facts were collected."));
    facts.forEach((fact) => {
      analysisPanel.append(makeElement("p", "company-description", `${fact.name}: ${fact.value} · ${fact.data_type}`));
      if (fact.source_url) addLink(analysisPanel, `Source · ${fact.retrieved_at || "retrieval time unavailable"}`, fact.source_url);
    });
    analysisPanel.append(makeElement("h4", "", "Unavailable data and limitations"));
    (analysis.unavailable_data || []).forEach((item) => {
      analysisPanel.append(makeElement("p", "company-description", `${item.name}: ${item.value} · status ${item.status || "source_unavailable"}. ${item.reason}`));
      if (item.next_step) analysisPanel.append(makeElement("p", "approved-empty", `Next step: ${item.next_step}`));
    });
    (analysis.limitations || []).forEach((item) => analysisPanel.append(makeElement("p", "approved-empty", item)));
    if (analysis.collection_error) analysisPanel.append(makeElement("p", "notice", analysis.collection_error));
    if (refreshed) analysisPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function loadApprovedCompetitors() {
    try {
      const response = await fetch("/api/companies/approved");
      const payload = await response.json();
      if (!response.ok) throw new Error("Could not reload approved competitors.");
      const restored = (payload.competitors || []).map((record) => record.candidate).filter(Boolean);
      mergeDiscoveredCandidates(restored);
      renderApprovedCompetitors();
      if (dashboardData) renderDashboardKpis(dashboardData);
    } catch {
      // Existing page remains usable; server reports storage errors on writes/refresh.
    }
  }

  function scoreLabel(value) {
    return Number.isFinite(value) ? `${value.toFixed(2)}/100` : "Unavailable";
  }

  function renderDashboard(data) {
    dashboardData = data;
    document.querySelector("#dashboard-method").textContent = data.overall_method || "Scores are calculated only from sourced metrics.";
    const competitors = Array.isArray(data.competitors) ? data.competitors : [];
    const summary = document.querySelector("#dashboard-summary");
    renderDashboardKpis(data);
    summary.replaceChildren(makeElement("p", "approved-empty", `${competitors.length} approved competitor${competitors.length === 1 ? "" : "s"}. ${data.normalization || ""}`));
    summary.append(makeElement("p", "dashboard-limitation", data.scoring_input_requirements || "Category scores require sourced evidence and sufficient metrics."));
    (data.limitations || []).forEach((item) => summary.append(makeElement("p", "dashboard-limitation", item)));
    dashboardRows.replaceChildren();
    if (!competitors.length) {
      const row = document.createElement("tr");
      const cell = makeElement("td", "", "Approve competitors to see their score coverage and compare sourced metrics.");
      cell.colSpan = 9;
      row.append(cell);
      dashboardRows.append(row);
    }
    const activeIds = new Set(competitors.map((item) => item.candidate_id));
    [...selectedCompetitors].forEach((id) => { if (!activeIds.has(id)) selectedCompetitors.delete(id); });
    const visibleCompetitors = dashboardCompetitorsForView(competitors);
    if (competitors.length && visibleCompetitors.length === 0) {
      const row = document.createElement("tr");
      const cell = makeElement("td", "", "No approved competitors match the current search and filters.");
      cell.colSpan = 9;
      row.append(cell);
      dashboardRows.append(row);
    }
    visibleCompetitors.forEach((competitor) => {
      const row = document.createElement("tr");
      const selectCell = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedCompetitors.has(competitor.candidate_id);
      checkbox.dataset.compareId = competitor.candidate_id;
      checkbox.setAttribute("aria-label", `Select ${competitor.company_name} for comparison`);
      selectCell.append(checkbox);
      const nameCell = document.createElement("td");
      nameCell.append(makeElement("strong", "", competitor.company_name || "Name unavailable"));
      nameCell.append(document.createElement("br"));
      addLink(nameCell, competitor.website_url || "Website unavailable", competitor.website_url);
      nameCell.append(makeElement("small", "dashboard-unverified", "Unverified profile"));
      const overallCell = document.createElement("td");
      overallCell.append(makeElement("strong", "", scoreLabel(competitor.overall_score)));
      const scoreBreakdown = document.createElement("details");
      scoreBreakdown.append(makeElement("summary", "", "Calculation"));
      scoreBreakdown.append(makeElement("p", "", competitor.score_explanation || "Overall score unavailable."));
      const adjusted = competitor.adjusted_weights || {};
      Object.entries(adjusted).forEach(([key, weight]) => scoreBreakdown.append(makeElement("small", "", `${key.replaceAll("_", " ")}: ${weight}% adjusted weight`)));
      overallCell.append(scoreBreakdown);
      const categoryCell = document.createElement("td");
      const categoryList = document.createElement("ul");
      categoryList.className = "category-score-list";
      Object.entries(competitor.category_scores || {}).forEach(([key, value]) => {
        const li = document.createElement("li");
        li.append(makeElement("span", "", `${value.label} (${value.weight}%): ${value.score === null ? "Unavailable" : `${value.score}/100`}`));
        li.append(makeElement("small", "", `Collection: ${value.collection_status || (value.status === "available" ? "collected" : "not_collected")}. ${value.reason || "No explanation stored."}`));
        if (value.next_step) li.append(makeElement("small", "", `Next step: ${value.next_step}`));
        li.title = value.reason || "No explanation stored.";
        if (value.sources && value.sources.length) {
          value.sources.forEach((source, index) => addLink(li, `Source ${index + 1} · retrieved ${source.retrieved_at || "time unavailable"}`, source.url));
        } else if (value.reason) li.title = value.reason;
        categoryList.append(li);
      });
      categoryCell.append(categoryList);
      const completenessCell = makeElement("td", "", `${competitor.data_completeness}% sourced weight coverage`);
      const threatCell = document.createElement("td");
      const threatLabel = makeElement("span", "threat-unavailable", competitor.threat?.level || "Insufficient data");
      threatLabel.title = Array.isArray(competitor.threat?.reasons) ? competitor.threat.reasons.join(" ") : "Threat evidence unavailable.";
      threatCell.append(threatLabel);
      const updatedCell = makeElement("td", "", competitor.last_updated || "Not analyzed");
      const missingCell = makeElement("td", "", (competitor.unavailable_categories || []).map((item) => item.replaceAll("_", " ")).join(", ") || "None");
      const insightsCell = document.createElement("td");
      const insightsButton = makeElement("button", "discovery-action", "Generate / view insights");
      insightsButton.type = "button";
      insightsButton.dataset.insightsOpen = competitor.candidate_id;
      insightsCell.append(insightsButton);
      row.append(selectCell, nameCell, overallCell, categoryCell, completenessCell, threatCell, updatedCell, missingCell, insightsCell);
      dashboardRows.append(row);
    });
    compareButton.disabled = selectedCompetitors.size < 2;
  }

  async function loadDashboard() {
    try {
      const response = await fetch("/api/companies/dashboard");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Could not load the comparison dashboard.");
      renderDashboard(payload);
    } catch (error) {
      dashboardRows.replaceChildren();
      const row = document.createElement("tr");
      const cell = makeElement("td", "notice error", error instanceof Error ? error.message : "Dashboard unavailable.");
      cell.colSpan = 9;
      row.append(cell);
      dashboardRows.append(row);
    }
  }

  function appendBarChart(container, title, rows, description) {
    const figure = document.createElement("figure");
    figure.className = "comparison-chart";
    figure.append(makeElement("h3", "", title));
    figure.append(makeElement("figcaption", "chart-summary", description));
    if (!rows.length) {
      figure.append(makeElement("p", "approved-empty", "No comparable sourced scores are available for this chart."));
      container.append(figure);
      return;
    }
    const chart = makeElement("div", "bar-chart");
    rows.forEach((item) => {
      const line = makeElement("div", "chart-row");
      line.append(makeElement("span", "chart-label", item.label));
      if (!Number.isFinite(item.value)) {
        line.append(makeElement("span", "chart-unavailable", "Unavailable"));
      } else {
        const track = makeElement("span", "chart-track");
        const bar = makeElement("span", "chart-bar");
        bar.style.width = `${Math.max(0, Math.min(100, item.value))}%`;
        bar.setAttribute("aria-hidden", "true");
        track.append(bar);
        line.append(track, makeElement("span", "chart-value", `${item.value}/100`));
      }
      chart.append(line);
    });
    figure.append(chart);
    container.append(figure);
  }

  function renderRadar(container, competitors, categories) {
    if (categories.length < 3 || competitors.length < 2) return;
    const figure = document.createElement("figure");
    figure.className = "comparison-chart radar-figure";
    figure.append(makeElement("h3", "", "Comparable category radar"));
    const summary = competitors.map((competitor) => `${competitor.company_name}: ${categories.map((key) => `${key.replaceAll("_", " ")} ${competitor.category_scores[key].score}/100`).join(", ")}`).join(". ");
    figure.append(makeElement("figcaption", "chart-summary", summary));
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 360 300");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Radar chart comparing ${categories.length} sourced categories. ${summary}`);
    const cx = 180, cy = 145, radius = 95;
    for (const factor of [0.25, 0.5, 0.75, 1]) {
      const ring = document.createElementNS(svg.namespaceURI, "circle");
      ring.setAttribute("cx", cx); ring.setAttribute("cy", cy); ring.setAttribute("r", radius * factor);
      ring.setAttribute("fill", "none"); ring.setAttribute("stroke", "#dce8e2");
      svg.append(ring);
    }
    const point = (index, value) => {
      const angle = -Math.PI / 2 + index * 2 * Math.PI / categories.length;
      const distance = radius * value / 100;
      return [cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance];
    };
    categories.forEach((key, index) => {
      const [x, y] = point(index, 100);
      const axis = document.createElementNS(svg.namespaceURI, "line");
      axis.setAttribute("x1", cx); axis.setAttribute("y1", cy); axis.setAttribute("x2", x); axis.setAttribute("y2", y); axis.setAttribute("stroke", "#dce8e2");
      svg.append(axis);
      const label = document.createElementNS(svg.namespaceURI, "text");
      label.setAttribute("x", cx + Math.cos(-Math.PI / 2 + index * 2 * Math.PI / categories.length) * (radius + 22));
      label.setAttribute("y", cy + Math.sin(-Math.PI / 2 + index * 2 * Math.PI / categories.length) * (radius + 22));
      label.setAttribute("text-anchor", "middle"); label.setAttribute("font-size", "8"); label.textContent = key.replaceAll("_", " "); svg.append(label);
    });
    competitors.forEach((competitor, index) => {
      const points = categories.map((key, categoryIndex) => point(categoryIndex, competitor.category_scores[key].score).join(",")).join(" ");
      const polygon = document.createElementNS(svg.namespaceURI, "polygon");
      polygon.setAttribute("points", points); polygon.setAttribute("fill", index ? "#d39a4a33" : "#2f8b6b33"); polygon.setAttribute("stroke", index ? "#b77d32" : "#26745f"); polygon.setAttribute("stroke-width", "2"); svg.append(polygon);
    });
    figure.append(svg);
    competitors.forEach((competitor, index) => figure.append(makeElement("p", `chart-legend radar-series-${index % 2}`, `● ${competitor.company_name}`)));
    container.append(figure);
  }

  async function compareSelectedCompetitors() {
    comparisonPanel.hidden = false;
    comparisonPanel.replaceChildren(makeElement("p", "approved-empty", "Loading comparison…"));
    try {
      const response = await fetch("/api/companies/dashboard/compare", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ candidate_ids: [...selectedCompetitors] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not compare selected competitors.");
      comparisonPanel.replaceChildren(makeElement("h3", "", "Selected competitor comparison"), makeElement("p", "chart-summary", data.summary));
      const charts = makeElement("div", "comparison-chart-grid");
      appendBarChart(charts, "Overall score comparison", data.competitors.map((item) => ({ label: item.company_name, value: item.overall_score })), "Overall scores appear only when at least two sourced categories and 25% of PRD weight coverage are available.");
      const categoryRows = [];
      data.comparable_categories.forEach((category) => data.competitors.forEach((competitor) => categoryRows.push({ label: `${category.replaceAll("_", " ")} · ${competitor.company_name}`, value: competitor.category_scores[category].score })));
      appendBarChart(charts, "Comparable category scores", categoryRows, "Every displayed score is normalized within the complete approved competitor set.");
      appendBarChart(charts, "Sourced-data availability", data.competitors.map((item) => ({ label: item.company_name, value: item.data_completeness })), "Percentage is the PRD weight coverage with sourced raw category metrics; it is not a performance score.");
      renderRadar(charts, data.competitors, data.comparable_categories);
      comparisonPanel.append(charts);
      const savedInsightsButton = makeElement("button", "discovery-action", "View / generate comparison insights");
      savedInsightsButton.type = "button";
      savedInsightsButton.dataset.comparisonInsights = "true";
      comparisonPanel.append(savedInsightsButton);
      comparisonPanel.append(makeElement("h4", "", "Observed comparison gaps"));
      if (!data.gaps.length) comparisonPanel.append(makeElement("p", "approved-empty", "No category gaps can be established from currently comparable evidence."));
      data.gaps.forEach((gap) => comparisonPanel.append(makeElement("p", "company-description", `${gap.category.replaceAll("_", " ")}: ${gap.difference} point normalized difference. ${gap.interpretation}`)));
      comparisonPanel.append(makeElement("h4", "", "Potential opportunities to investigate"));
      if (!data.opportunities.length) comparisonPanel.append(makeElement("p", "approved-empty", "No evidence-based opportunities identified."));
      data.opportunities.forEach((opportunity) => comparisonPanel.append(makeElement("p", "company-description", opportunity.description)));
      comparisonPanel.append(makeElement("h4", "", "Observed facts and derived scores"));
      data.competitors.forEach((competitor) => {
        const evidence = makeElement("details", "evidence-details");
        evidence.append(makeElement("summary", "", competitor.company_name));
        const facts = Array.isArray(competitor.observed_facts) ? competitor.observed_facts : [];
        evidence.append(makeElement("h5", "", "Observed facts"));
        if (!facts.length) evidence.append(makeElement("p", "approved-empty", "No observed facts stored."));
        facts.forEach((fact) => {
          evidence.append(makeElement("p", "company-description", `${fact.name || "Fact"}: ${fact.value || "Unavailable"} · ${fact.data_type || "collected fact"}`));
          if (fact.source_url) addLink(evidence, `Source · ${fact.retrieved_at || "time unavailable"}`, fact.source_url);
        });
        evidence.append(makeElement("h5", "", "Derived metrics"));
        const derived = Array.isArray(competitor.derived_metrics) ? competitor.derived_metrics : [];
        if (!derived.length) evidence.append(makeElement("p", "approved-empty", "No sourced numeric category metrics are available to derive scores."));
        derived.forEach((item) => {
          evidence.append(makeElement("p", "company-description", `${item.category.replaceAll("_", " ")}: raw ${item.raw_score}/100; cohort-normalized ${item.normalized_score === null ? "Unavailable" : `${item.normalized_score}/100`}. ${item.explanation}`));
          (item.sources || []).forEach((source) => addLink(evidence, `Source · ${source.retrieved_at}`, source.url));
        });
        comparisonPanel.append(evidence);
      });
      const missing = data.unavailable_categories.map((item) => item.replaceAll("_", " ")).join(", ");
      comparisonPanel.append(makeElement("p", "dashboard-limitation", `Unavailable for all selected competitors: ${missing || "none"}.`));
      comparisonPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      comparisonPanel.replaceChildren(makeElement("p", "notice error", error instanceof Error ? error.message : "Comparison unavailable."));
    }
  }

  function addInsightButton(ids, label) {
    const button = makeElement("button", "discovery-action", label);
    button.type = "button";
    button.dataset.insightsGenerate = "true";
    if (ids.length === 1) button.dataset.candidateId = ids[0];
    return button;
  }

  function showInsightState(message, ids, stale = false) {
    insightsPanel.hidden = false;
    insightsOutput.replaceChildren(makeElement("p", stale ? "notice" : "approved-empty", message));
    insightsOutput.append(addInsightButton(ids, stale ? "Refresh Insights" : "Generate Insights"));
    insightsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderInsightDocument(insights, stale = false) {
    insightsPanel.hidden = false;
    insightsOutput.replaceChildren();
    if (stale) insightsOutput.append(makeElement("p", "notice", "Stored analysis changed since these insights were generated. Refresh them before relying on this output."));
    insightsOutput.append(makeElement("p", "insight-mode", `Generation mode: ${insights.generation_mode === "ai_model" ? "AI model (evidence items selected; text and claims remain deterministic)" : "Deterministic fallback (no AI model generated this output)"}`));
    insightsOutput.append(makeElement("p", "approved-empty", `Generated: ${insights.generation_timestamp || "Unavailable"} · Status: ${(insights.status || "insufficient_evidence").replaceAll("_", " ")}`));
    insightsOutput.append(makeElement("p", "company-description", insights.overview || "Insufficient evidence for an overview."));
    if (insights.provider_error) insightsOutput.append(makeElement("p", "notice", insights.provider_error));
    if (insights.generation_note) insightsOutput.append(makeElement("p", "dashboard-limitation", insights.generation_note));

    insightsOutput.append(makeElement("h4", "", "Findings"));
    const findings = Array.isArray(insights.findings) ? insights.findings : [];
    if (!findings.length) insightsOutput.append(makeElement("p", "approved-empty", "Insufficient evidence for supported company findings or comparisons."));
    findings.forEach((finding) => {
      const article = makeElement("article", "insight-item");
      article.append(makeElement("p", "company-description", finding.text));
      article.append(makeElement("span", "insight-strength", `${finding.evidence_strength || "Unavailable"} evidence`));
      const sources = Array.isArray(finding.source_urls) ? finding.source_urls : [];
      if (!sources.length) article.append(makeElement("p", "approved-empty", "No source URL is available for this item."));
      sources.forEach((source, index) => addLink(article, `Evidence ${index + 1} · ${source.retrieved_at || "time unavailable"}`, source.url));
      insightsOutput.append(article);
    });

    insightsOutput.append(makeElement("h4", "", "Potential opportunities to investigate"));
    const opportunities = Array.isArray(insights.potential_opportunities) ? insights.potential_opportunities : [];
    if (!opportunities.length) insightsOutput.append(makeElement("p", "approved-empty", "No comparable evidence supports a specific opportunity."));
    opportunities.forEach((item) => {
      const row = makeElement("p", "company-description", item.action || item.description || "Investigate the supported comparison gap.");
      insightsOutput.append(row);
      (item.source_urls || []).forEach((source, index) => addLink(insightsOutput, `Opportunity evidence ${index + 1}`, source.url));
    });

    insightsOutput.append(makeElement("h4", "", "Recommendations"));
    const recommendations = Array.isArray(insights.recommendations) ? insights.recommendations : [];
    if (!recommendations.length) insightsOutput.append(makeElement("p", "approved-empty", "No evidence-based recommendations are available."));
    recommendations.forEach((item) => {
      const article = makeElement("article", "insight-item");
      article.append(makeElement("p", "company-description", item.action));
      article.append(makeElement("p", "approved-empty", item.rationale || "Recommendation for further investigation; no outcome is guaranteed."));
      article.append(makeElement("span", "insight-strength", `${item.evidence_strength || "Unavailable"} support`));
      if (!Array.isArray(item.source_urls) || !item.source_urls.length) article.append(makeElement("p", "approved-empty", `Support basis: ${item.basis === "data_gap" ? "missing-data indicator; no company source exists" : "no source URL was available"}.`));
      (item.source_urls || []).forEach((source, index) => addLink(article, `Supporting evidence ${index + 1} · ${source.retrieved_at || "time unavailable"}`, source.url));
      insightsOutput.append(article);
    });

    insightsOutput.append(makeElement("h4", "", "Missing data and limitations"));
    const missing = Array.isArray(insights.missing_data) ? insights.missing_data : [];
    if (!missing.length) insightsOutput.append(makeElement("p", "approved-empty", "No recorded data gaps."));
    missing.forEach((item) => insightsOutput.append(makeElement("p", "approved-empty", `${item.item}: ${item.reason}`)));
    insightsOutput.append(makeElement("h4", "", "Evidence-strength definitions"));
    Object.entries(insights.confidence_definitions || {}).forEach(([level, definition]) => insightsOutput.append(makeElement("p", "approved-empty", `${level}: ${definition}`)));

    const ids = Array.isArray(insights.candidate_ids) ? insights.candidate_ids : [];
    insightsOutput.append(addInsightButton(ids, stale ? "Refresh Insights" : "Regenerate Insights"));
    insightsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function openCompetitorInsights(candidateId) {
    insightsPanel.hidden = false;
    insightsOutput.replaceChildren(makeElement("p", "approved-empty", "Loading saved insights…"));
    try {
      const response = await fetch(`/api/companies/approved/${encodeURIComponent(candidateId)}/insights`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Could not load saved insights.");
      if (!payload.insights) showInsightState("No saved insights yet. Generate evidence-based findings for this competitor.", [candidateId]);
      else renderInsightDocument(payload.insights, payload.status === "stale");
    } catch (error) {
      insightsOutput.replaceChildren(makeElement("p", "notice error", error instanceof Error ? error.message : "Could not load insights."));
    }
  }

  async function openComparisonInsights() {
    const ids = [...selectedCompetitors];
    insightsPanel.hidden = false;
    insightsOutput.replaceChildren(makeElement("p", "approved-empty", "Loading saved comparison insights…"));
    try {
      const query = new URLSearchParams();
      ids.forEach((id) => query.append("candidate_ids", id));
      const response = await fetch(`/api/companies/dashboard/insights?${query.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Could not load comparison insights.");
      if (!payload.insights) showInsightState("No saved insights for this selection. Generate an evidence-based comparison.", ids);
      else renderInsightDocument(payload.insights, payload.status === "stale");
    } catch (error) {
      insightsOutput.replaceChildren(makeElement("p", "notice error", error instanceof Error ? error.message : "Could not load comparison insights."));
    }
  }

  async function requestInsights(ids, button) {
    if (!ids.length) return;
    button.disabled = true;
    insightsPanel.hidden = false;
    insightsOutput.replaceChildren(makeElement("p", "approved-empty", "Building source-linked insights…"));
    try {
      const comparison = ids.length > 1;
      const response = comparison
        ? await fetch("/api/companies/dashboard/insights", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ candidate_ids: ids }) })
        : await fetch(`/api/companies/approved/${encodeURIComponent(ids[0])}/insights/generate`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Could not generate insights.");
      renderInsightDocument(payload);
    } catch (error) {
      insightsOutput.replaceChildren(makeElement("p", "notice error", error instanceof Error ? error.message : "Could not generate insights."));
    } finally {
      button.disabled = false;
    }
  }

  dashboardRows.addEventListener("change", (event) => {
    const checkbox = event.target.closest("input[data-compare-id]");
    if (!checkbox) return;
    if (checkbox.checked) selectedCompetitors.add(checkbox.dataset.compareId);
    else selectedCompetitors.delete(checkbox.dataset.compareId);
    compareButton.disabled = selectedCompetitors.size < 2;
  });
  dashboardSearch.addEventListener("input", () => { if (dashboardData) renderDashboard(dashboardData); });
  dashboardFilter.addEventListener("change", () => { if (dashboardData) renderDashboard(dashboardData); });
  dashboardSort.addEventListener("change", () => { if (dashboardData) renderDashboard(dashboardData); });
  compareButton.addEventListener("click", compareSelectedCompetitors);

  function renderChatMessage(message) {
    const bubble = makeElement("article", `chat-message ${message.role === "user" ? "user" : "assistant"}`);
    bubble.append(makeElement("p", "", message.content || ""));
    if (message.mode && message.role === "assistant") bubble.append(makeElement("small", "chat-message-meta", message.mode));
    const links = Array.isArray(message.source_links) ? message.source_links : [];
    if (links.length) {
      const sources = makeElement("div", "chat-message-sources");
      links.forEach((source) => addLink(sources, source.label || "Source", source.url));
      bubble.append(sources);
    }
    const downloads = Array.isArray(message.downloads) ? message.downloads : [];
    if (downloads.length) {
      const actions = makeElement("div", "chat-message-downloads");
      downloads.forEach((item) => {
        if (!item || !["/api/companies/dashboard/export.pdf", "/api/companies/dashboard/export.csv"].includes(item.url)) return;
        const link = makeElement("a", "discovery-action", item.label || "Download report");
        link.href = item.url;
        link.setAttribute("download", "");
        actions.append(link);
      });
      if (actions.childElementCount) bubble.append(actions);
    }
    const confirmation = message.confirmation;
    if (confirmation && confirmation.token) {
      const controls = makeElement("div", "chat-confirmation");
      const confirm = makeElement("button", "", confirmation.action === "remove" ? "Confirm removal" : confirmation.action === "reject" ? "Confirm rejection" : "Confirm approval");
      confirm.type = "button";
      confirm.dataset.chatConfirm = "true";
      confirm.dataset.confirmationToken = confirmation.token;
      const cancel = makeElement("button", "", "Cancel");
      cancel.type = "button";
      cancel.dataset.chatConfirm = "false";
      cancel.dataset.confirmationToken = confirmation.token;
      controls.append(confirm, cancel);
      bubble.append(controls);
    }
    if (message.retryable) {
      const retry = makeElement("button", "discovery-action", "Retry");
      retry.type = "button";
      retry.dataset.chatRetry = "true";
      bubble.append(retry);
    }
    chatMessages.append(bubble);
  }

  function renderChatConversation(conversation) {
    if (!conversation || typeof conversation !== "object") return;
    currentConversationId = conversation.conversation_id;
    const cachedCandidates = Array.isArray(conversation.candidate_cache) ? conversation.candidate_cache : [];
    if (cachedCandidates.length) {
      mergeDiscoveredCandidates(cachedCandidates);
      renderDiscovery({ companies: discoveredCandidates, message: "Live chat search candidates are shown below. Review the source and approve candidates to add them to your competitor list." });
    }
    chatMessages.replaceChildren();
    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    messages.forEach(renderChatMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    const lastAssistant = [...messages].reverse().find((item) => item.role === "assistant" && item.mode);
    if (lastAssistant) chatModeNotice.textContent = lastAssistant.mode;
    const retryIndex = messages.findLastIndex((item) => item.role === "assistant" && item.retryable);
    retryMessage = retryIndex > 0 && messages[retryIndex - 1].role === "user" ? messages[retryIndex - 1].content || "" : "";
    const suggestions = [...messages].reverse().find((item) => Array.isArray(item.suggestions) && item.suggestions.length)?.suggestions || [];
    chatSuggestions.replaceChildren();
    suggestions.slice(0, 4).forEach((text) => {
      const button = makeElement("button", "", text);
      button.type = "button";
      button.dataset.chatSuggestion = text;
      chatSuggestions.append(button);
    });
  }

  async function initializeChat() {
    try {
      const listResponse = await fetch("/api/chat/conversations", { headers: chatHeaders });
      const list = await listResponse.json();
      if (!listResponse.ok) throw new Error("Chat history could not be loaded.");
      const latest = Array.isArray(list.conversations) ? list.conversations[0] : null;
      if (latest) {
        const response = await fetch(`/api/chat/conversations/${encodeURIComponent(latest.conversation_id)}`, { headers: chatHeaders });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || "Chat history could not be loaded.");
        renderChatConversation(payload.conversation);
      } else {
        await createChatConversation();
      }
    } catch (error) {
      chatMessages.replaceChildren();
      const bubble = makeElement("article", "chat-message assistant error");
      bubble.setAttribute("role", "alert");
      bubble.append(makeElement("p", "", error instanceof Error ? error.message : "Chat is unavailable. Use the existing search and dashboard controls."));
      chatMessages.append(bubble);
    }
  }

  async function createChatConversation() {
    const response = await fetch("/api/chat/conversations", { method: "POST", headers: { ...chatHeaders, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({}) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "Could not start a new conversation.");
    renderChatConversation(payload.conversation);
  }

  function setChatBusy(busy, label = "Checking the request…") {
    chatBusy = busy;
    chatStatus.hidden = !busy;
    chatStatus.lastElementChild.textContent = label;
    chatSend.disabled = busy;
    chatInput.disabled = busy;
  }

  async function sendChatMessage(rawMessage) {
    const message = String(rawMessage || "").trim();
    if (!message || chatBusy || !currentConversationId) return;
    if (message.length > 1500) return;
    chatInput.value = "";
    setChatBusy(true, /search|find|discover/i.test(message) ? "Searching the configured public source…" : "Checking approved competitors and stored evidence…");
    let statusTimer = window.setTimeout(() => setChatBusy(true, "Waiting for the existing application tool…"), 1800);
    try {
      const response = await fetch(`/api/chat/conversations/${encodeURIComponent(currentConversationId)}/messages`, {
        method: "POST",
        headers: { ...chatHeaders, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ message, selected_candidate_ids: [...selectedCompetitors] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || `Chat request failed (HTTP ${response.status}).`);
      retryMessage = "";
      renderChatConversation(payload.conversation);
    } catch (error) {
      retryMessage = message;
      const bubble = makeElement("article", "chat-message assistant error");
      bubble.setAttribute("role", "alert");
      bubble.append(makeElement("p", "", error instanceof Error ? error.message : "The chat request failed."));
      const retry = makeElement("button", "discovery-action", "Retry");
      retry.type = "button";
      retry.dataset.chatRetry = "true";
      bubble.append(retry);
      chatMessages.append(bubble);
    } finally {
      window.clearTimeout(statusTimer);
      setChatBusy(false);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  async function confirmChatAction(confirm, token, button) {
    if (chatBusy || !currentConversationId || !token) return;
    button.disabled = true;
    setChatBusy(true, confirm === "true" ? "Applying the confirmed action…" : "Canceling the pending action…");
    try {
      const response = await fetch(`/api/chat/conversations/${encodeURIComponent(currentConversationId)}/confirm`, {
        method: "POST", headers: { ...chatHeaders, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token, confirm: confirm === "true" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "The action could not be confirmed.");
      renderChatConversation(payload.conversation);
      await loadDashboard();
      await loadApprovedCompetitors();
    } catch (error) {
      const bubble = makeElement("article", "chat-message assistant error");
      bubble.setAttribute("role", "alert");
      bubble.append(makeElement("p", "", error instanceof Error ? error.message : "The action could not be confirmed."));
      chatMessages.append(bubble);
    } finally {
      setChatBusy(false);
    }
  }

  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendChatMessage(chatInput.value);
  });
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });
  document.querySelector("#new-chat").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      if (currentConversationId) {
        const response = await fetch(`/api/chat/conversations/${encodeURIComponent(currentConversationId)}`, { method: "DELETE", headers: chatHeaders });
        if (!response.ok) throw new Error("The current conversation could not be cleared.");
      }
      await createChatConversation();
    } catch (error) {
      chatModeNotice.textContent = error instanceof Error ? error.message : "Could not start a new chat.";
    } finally {
      button.disabled = false;
    }
  });

  function renderErrors(payload, fallbackMessage) {
    const text = [];
    if (typeof payload.message === "string" && payload.message.trim()) text.push(payload.message.trim());
    if (Array.isArray(payload.errors)) {
      for (const error of payload.errors) {
        if (error && typeof error.message === "string" && error.message.trim()) {
          text.push(error.message.trim());
        }
      }
    }
    if (text.length === 0) text.push(fallbackMessage);
    const guidance = typeof payload.suggested_action === "string" && payload.suggested_action.trim()
      ? payload.suggested_action.trim()
      : "Try again later, or enter company website URLs manually.";
    showMessage(
      "Search unavailable",
      `${[...new Set(text)].join(" ")} ${guidance}`,
      true
    );
  }

  manualUrlForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = document.querySelector("#manual-urls").value.split(/[\r\n,]+/);
    const seen = new Set();
    const companies = [];
    for (const value of values) {
      const url = safeWebUrl(value.trim());
      if (!url || seen.has(url)) continue;
      seen.add(url);
      companies.push({
        company_name: "",
        website_url: url,
        source_url: url,
        source_title: "User supplied URL",
        description: null,
        verified: false,
      });
    }
    if (companies.length === 0) {
      showMessage("Enter a valid website URL", "Add one or more http or https URLs, one per line.", true);
      return;
    }
    renderCompanies({
      companies,
      message: "These URLs were supplied manually and have not been independently verified.",
    });
    document.querySelector("#results-heading").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  manualCompetitorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const companyName = document.querySelector("#manual-company-name").value.trim();
    const websiteUrl = safeWebUrl(document.querySelector("#manual-company-url").value.trim());
    if (!companyName || !websiteUrl) {
      showMessage("Check the manual competitor details", "Enter a company name and a valid http or https website URL.", true);
      return;
    }
    const submitButton = manualCompetitorForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    try {
      const response = await fetch("/api/companies/discovery/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          candidate: {
            company_name: companyName,
            website_url: websiteUrl,
            source_url: websiteUrl,
            source_title: "User supplied URL",
            description: null,
            verified: false,
          },
          industry: document.querySelector("#industry").value.trim() || null,
          location: locationInput.value.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.candidate) throw new Error(payload.detail || "Could not add this candidate.");
      const newCandidate = payload.candidate;
      const existingIndex = discoveredCandidates.findIndex((candidate) => candidate.candidate_id === newCandidate.candidate_id);
      if (existingIndex >= 0 && discoveredCandidates[existingIndex].approval_status === "approved") {
        newCandidate.approval_status = "approved";
        discoveredCandidates[existingIndex] = newCandidate;
      } else if (existingIndex >= 0) {
        discoveredCandidates[existingIndex] = newCandidate;
      } else {
        discoveredCandidates.push(newCandidate);
      }
      discoveredCandidates.sort((a, b) => {
        const scoreA = Number.isFinite(a.relevance_score) ? a.relevance_score : -1;
        const scoreB = Number.isFinite(b.relevance_score) ? b.relevance_score : -1;
        return scoreB - scoreA;
      });
      renderDiscovery({ companies: discoveredCandidates, message: "Candidates are ranked from supplied context and unverified source information. Review before approval." });
      manualCompetitorForm.reset();
      document.querySelector("#results-heading").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      showMessage("Could not add competitor", error instanceof Error ? error.message : "Please try again.", true);
    } finally {
      submitButton.disabled = false;
    }
  });

  renderApprovedCompetitors();
  loadApprovedCompetitors();
  loadDashboard();
  initializeChat();

  locationInput.addEventListener("input", () => {
    locationBadge.textContent = locationInput.value.trim() || "Location not set";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const industry = document.querySelector("#industry").value.trim();
    const company = document.querySelector("#company").value.trim();
    const location = document.querySelector("#location").value.trim();
    const query = [industry, company, location].filter(Boolean).join(" ").slice(0, 200);

    if (query.length < 2) {
      showMessage("Add a search term", "Enter an industry, company name, or location to search public sources.", true);
      return;
    }

    setLoading(true);
    resultCount.hidden = true;
    resultsContent.replaceChildren(
      makeElement("div", "loading-state", "")
    );
    const loading = resultsContent.firstElementChild;
    loading.append(
      makeElement("span", "loading-ring"),
      makeElement("span", "", "Searching public web sources. This may take a few seconds…")
    );

    try {
      const response = await fetch("/api/companies/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...chatHeaders,
          ...(currentConversationId ? { "X-Chat-Conversation": currentConversationId } : {}),
        },
        body: JSON.stringify({ query, count: 10, industry: industry || null, location: location || null }),
      });
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`The search API returned an unreadable response (HTTP ${response.status}).`);
      }

      if (!response.ok) {
        renderErrors(payload && typeof payload === "object" ? payload : {}, `Search request failed (HTTP ${response.status}).`);
      } else if (
        !payload ||
        typeof payload !== "object" ||
        payload.status === "unavailable" ||
        (Array.isArray(payload.errors) && payload.errors.length > 0)
      ) {
        renderErrors(payload && typeof payload === "object" ? payload : {}, "Live company search is unavailable.");
      } else if (payload.status !== "success" || !Array.isArray(payload.companies)) {
        renderErrors({}, "The search API returned an unexpected response; no results are shown.");
      } else {
        mergeDiscoveredCandidates(payload.companies);
        renderDiscovery({ ...payload, companies: discoveredCandidates });
      }
    } catch (error) {
      renderErrors({}, error instanceof Error ? error.message : "Could not connect to the search API.");
    } finally {
      setLoading(false);
    }
  });
})();
