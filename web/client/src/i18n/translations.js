export const translations = {
  en: {
    // Navigation & Header
    nav: {
      brand: 'DMARC',
      brandSuffix: 'Sentinel',
      live: 'LIVE',
      tagline: 'Enterprise Email Authentication & Access Control',
      overview: 'Overview',
      health: 'Domain Health',
      alignment: 'Auth & Alignment',
      threats: 'Threat Intel & SOC',
      policies: 'Policies & Readiness',
      reports: 'Reports',
      records: 'Log Explorer',
      users: 'User Access',
      allDomains: 'All Monitored Domains',
      refresh: 'Refresh data from OpenSearch',
      profile: 'Profile & Preferences',
      manageUsers: 'Manage Users & Access',
      changePassword: 'Change Password',
      signOut: 'Sign Out',
      roleAdmin: 'Super Admin',
      roleManager: 'Manager',
      roleViewer: 'Viewer',
      language: 'Language',
      switchLanguage: 'Switch to Spanish (Español)',
      languageName: 'English',
      navigation: 'Navigation',
      monitoredDomain: 'Monitored Scope',
      systemControls: 'System Controls'
    },

    // User Profile Modal
    profileModal: {
      title: 'User Profile & Preferences',
      subtitle: 'Manage your personal account logon, organization identity, and system language',
      logonLabel: 'User Logon / Username',
      logonHelp: 'Your identity as author in executive reports and system audit logs.',
      emailLabel: 'Registered Email',
      orgLabel: 'Organization / Client Name',
      orgHelp: 'Corporate or client entity displayed on branded report covers.',
      logoLabel: 'Corporate Logo URL or Path',
      logoHelp: 'E.g. templates/assets/sentinel_logo.png or http://...',
      languageLabel: 'System Language',
      languageHelp: 'Select your preferred language for the console interface and generated reports.',
      themeLabel: 'Interface Theme & Color Scheme',
      themeHelp: 'Choose your visual experience. Light themes provide crisp, executive contrast for brightly lit environments.',
      themes: {
        dark: {
          name: 'Cyber Dark',
          desc: 'Sentinel SOC classic midnight & cyan'
        },
        light: {
          name: 'Executive Light',
          desc: 'Crisp corporate slate & clean white'
        },
        nordic: {
          name: 'Nordic Frost',
          desc: 'Cool ice-blue with arctic azure accents'
        },
        emerald: {
          name: 'Emerald Sentinel',
          desc: 'High-trust sage & forest green security'
        }
      },
      saveBtn: 'Save Profile & Preferences',
      savingBtn: 'Saving Preferences...',
      successMsg: 'Profile and preferences successfully saved!',
      errorMsg: 'Failed to update user profile.'
    },

    // Common UI terms
    common: {
      loading: 'Loading data...',
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
      close: 'Close',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search...',
      filter: 'Filter',
      export: 'Export',
      status: 'Status',
      actions: 'Actions',
      all: 'All',
      domain: 'Domain',
      volume: 'Volume',
      date: 'Date',
      pass: 'PASS',
      fail: 'FAIL',
      none: 'None',
      quarantine: 'Quarantine',
      reject: 'Reject',
      legitimate: 'Legitimate',
      suspicious: 'Suspicious',
      misconfigured: 'Misconfigured',
      active: 'Active',
      inactive: 'Inactive',
      na: 'N/A',
      yes: 'Yes',
      no: 'No',
      refresh: 'Refresh',
      compliant: 'Compliant'
    },

    // Filter controls
    filters: {
      allDomains: 'All Monitored Domains'
    },

    // KPIs & Executive Overview
    kpi: {
      title: 'Executive Metric Snapshot',
      totalMessages: 'Total Messages',
      totalMessagesDesc: 'Aggregate email volume processed',
      passRate: 'DMARC Pass Rate',
      passRateDesc: 'RFC 7489 authentication pass rate',
      compliantVolume: 'Compliant Volume',
      compliantVolumeDesc: 'Legitimate aligned corporate mail',
      unalignedThreats: 'Unaligned / Threats',
      unalignedThreatsDesc: 'Spoofing attempts or misconfigured mail',
      deliveryRate: 'Delivered (p=none)',
      deliveryRateDesc: 'Inbox delivery permitted',
      quarantined: 'Quarantined (spam)',
      quarantinedDesc: 'Diverted to recipient junk folder',
      blocked: 'Gateway Blocked',
      blockedDesc: 'Rejected at mail transfer agent'
    },

    // Auth & Alignment
    alignment: {
      title: 'Authentication & Alignment Matrix',
      subtitle: 'Correlating SPF and DKIM authentication against RFC 7489 alignment requirements',
      bothAligned: 'Both Aligned (Pass/Pass)',
      spfOnly: 'SPF Pass & DKIM Fail',
      dkimOnly: 'SPF Fail & DKIM Pass',
      neither: 'SPF Fail & DKIM Fail (Spoofing)',
      spfAlignmentRate: 'SPF Alignment Rate',
      dkimAlignmentRate: 'DKIM Alignment Rate',
      dispositionBreakdown: 'Receiver Policy Enforcement Breakdown',
      compliantVerdict: 'Fully Compliant Corporate Traffic',
      spfDkimComparison: 'Alignment Matrix Comparison'
    },

    // Volume & Trends
    trends: {
      title: 'Email Volume & Pass Rate Over Time',
      subtitle: 'Daily aggregated email message throughput and authentication compliance percentage',
      totalVolume: 'Total Messages',
      passedVolume: 'Compliant (Pass)',
      failedVolume: 'Failed (Spoofing/Threat)',
      passRatePercent: 'Pass Rate (%)',
      noData: 'No timeseries data available for selected filter.'
    },

    // Traffic & Senders
    senders: {
      title: 'Sending Infrastructure & Service Inventory',
      subtitle: 'Identification of third-party ESPs, forwarders, and direct sending systems',
      senderDomain: 'Base Domain / ESP',
      serviceName: 'Service Provider',
      volume: 'Message Volume',
      passRate: 'Pass Rate',
      classification: 'Classification',
      legitHelp: 'Legitimate authorized cloud or corporate infrastructure',
      misconfigHelp: 'Known provider failing SPF or DKIM alignment',
      suspiciousHelp: 'Unauthorized infrastructure attempting domain impersonation'
    },

    // Threat Intelligence
    threats: {
      title: 'Threat Intelligence & Active Spoofing Hunter',
      subtitle: 'Tracking unauthorized IPs and malicious infrastructure sending on your domain',
      highRiskIPs: 'High-Risk Unaligned IP Sources',
      sourceIp: 'Source IP Address',
      reverseDns: 'Reverse DNS (PTR)',
      country: 'Country / Geo',
      asnNetwork: 'Autonomous System (ASN)',
      spoofedVolume: 'Spoofed Messages',
      verdict: 'Threat Verdict',
      threatConfirmed: 'Confirmed Impersonation',
      noThreats: 'No critical spoofing sources detected in current scope.'
    },

    // Policies & Readiness
    policies: {
      title: 'Domain Readiness & Enforcement Roadmap',
      subtitle: 'Progressive roadmap to advance domains from p=none to p=quarantine and p=reject',
      domainName: 'Monitored Domain',
      currentPolicy: 'Current Policy',
      recommendedPolicy: 'Enforcement Recommendation',
      complianceScore: 'Compliance Rate',
      statusVerdict: 'Readiness Verdict',
      readyReject: 'Ready for p=reject (Strict Block)',
      readyQuarantine: 'Ready for p=quarantine',
      needsAlignment: 'Alignment Required Before Enforcement',
      protected: 'Fully Protected at p=reject'
    },

    // Raw Logs
    rawLogs: {
      title: 'OpenSearch DMARC Aggregate Log Explorer',
      subtitle: 'Direct query inspection of individual aggregate report records in OpenSearch',
      searchPlaceholder: 'Filter logs by IP, domain, selector, or disposition...',
      exportJson: 'Export JSON',
      sourceIp: 'Source IP',
      headerFrom: 'Header From',
      reporter: 'Reporter Org',
      spfResult: 'SPF Result',
      dkimResult: 'DKIM Result',
      dmarcResult: 'DMARC',
      messages: 'Count',
      disposition: 'Disposition',
      timestamp: 'Timestamp'
    },

    // Domain Health Diagnostics
    health: {
      title: 'Diagnostic DNS & Email Security Health',
      subtitle: 'Live DNS record verification for MX, SPF, DKIM, DMARC, and BIMI',
      selectDomain: 'Monitored Domain (from OpenSearch)',
      domainsAvailable: 'available',
      customDomain: 'Audit Another Custom Domain...',
      monitoredDomains: 'Monitored Domains:',
      quickSelect: 'Quick select:',
      noDomainsFound: 'No allowed domains found in OpenSearch',
      enterDomain: 'Enter domain name (e.g. example.com)...',
      dkimSelector: 'DKIM Selector (Optional)',
      runAudit: 'Analyze Domain',
      auditing: 'Auditing DNS...',
      mxTitle: 'Mail Exchange (MX) Records',
      spfTitle: 'Sender Policy Framework (SPF)',
      dkimTitle: 'DomainKeys Identified Mail (DKIM)',
      dmarcTitle: 'DMARC Record Syntax & Policy',
      bimiTitle: 'Brand Indicators for Message Identification (BIMI)',
      overallScore: 'Security Health Score',
      recordFound: 'Record Valid & Active',
      recordMissing: 'Record Missing or Invalid'
    },

    // Reports Dashboard
    reports: {
      engineBadge: 'ENTERPRISE REPORTING ENGINE',
      title: 'Branded DMARC Executive Reports',
      subtitle: 'Generate pixel-perfect client reports in PDF, multi-sheet Excel (.xlsx), and CSV formats with customizable corporate branding, logo placement, client readiness verdict, and white-labeling.',
      aggregateTab: 'Aggregate Views (PowerDMARC)',
      generateTab: 'Generate Report',
      brandingTab: 'Branding & Templates',
      historyTab: 'Report History',
      schedulesTab: 'Automated Schedules',
      
      // PowerDMARC Aggregate 8-Views
      aggregateTitle: 'PowerDMARC DMARC Aggregate Reports Suite',
      aggregateSubtitle: 'Pixel-perfect replica of PowerDMARC aggregate reporting suite: New Version Executive Dashboard, Per Sending Source, Per Result, Per Organization, Per Host, Detailed Stats, Geolocation Report, and Per Country.',
      viewNewVersion: 'New Version (Beta)',
      viewPerSource: 'Per Sending Source',
      viewPerResult: 'Per Result',
      viewPerOrg: 'Per Organization',
      viewPerHost: 'Per Host',
      viewDetailed: 'Detailed Stats',
      viewGeolocation: 'Geolocation Report',
      viewPerCountry: 'Per Country',

      // KPI Cards
      totalVolume: 'Total Volume',
      totalVolumeDesc: 'Aggregated email messages',
      dmarcCompliant: 'DMARC Compliant',
      alignedMessages: 'aligned messages',
      forwarded: 'Forwarded',
      indirectRelays: 'indirect relays',
      failed: 'Failed',
      unalignedThreats: 'unaligned / threats',

      // Charts & Summaries
      resultsOverview: 'Results Overview',
      timelineDesc: 'Daily authentication delivery breakdown across the selected period.',
      noTimeline: 'No timeline telemetry for the chosen window.',
      topSendingSources: 'Top Sending Sources',
      volumeDistDesc: 'Volume distribution by detected mail service.',
      overallScore: 'Overall Score',
      compliant: 'Compliant',
      total: 'Total',

      // Sending Sources Overview Table (View 1 & 2)
      sendingSourcesOverview: 'Sending Sources Overview',
      sendingSourcesOverviewDesc: 'High-level breakdown of all email sending vendors identified in DMARC aggregates.',
      viewFullPerSource: 'View Full Per-Source Explorer',
      colSendingSource: 'Sending Source',
      colSourceType: 'Source Type',
      colTotalMessages: 'Total Messages',
      colDmarcCompliant: 'DMARC Compliant',
      colDkimVerification: 'DKIM Verification',
      colSpfVerification: 'SPF Verification',
      colMessages: 'Messages',
      colDmarcCompliance: 'DMARC Compliance',
      noSourcesMatch: 'No sending sources match the current filter.',
      directServer: 'Direct Server',

      // Filter Cards (View 2)
      dmarcCompatibleSources: 'DMARC compatible sources',
      forwardedSources: 'Forwarded',
      failedSources: 'Failed',
      authorizedSystemsDesc: 'Authorized email systems passing authentication',
      intermediaryRelaysDesc: 'Intermediary relays surviving via intact DKIM signatures',
      shadowItDesc: 'Shadow IT or unauthorized spoofers failing both checks',
      showingSources: 'Showing {filtered} of {total} sending sources',

      // Nested Rows (View 2)
      sendingHostsFor: 'Sending Hostnames & IP Addresses for {name}',
      hostRecordsCount: '{count} host records',
      colSenderHostname: 'Sender Hostname',
      colCountryIp: 'Country & IP Address',
      colCompliant: 'Compliant',
      colDkimStatus: 'DKIM Status',
      colSpfStatus: 'SPF Status',
      noHostIps: 'No individual host IPs recorded for this source.',
      aligned: 'Aligned',
      unaligned: 'Unaligned',
      yes: 'Yes',
      no: 'No',

      // Per Result (View 3)
      resultGroupCorrect: 'DMARC correct - DKIM or SPF aligned',
      resultGroupAuthenticated: 'Authenticated - DKIM or SPF valid',
      resultGroupInvalid: 'Invalid flows - DKIM and SPF invalid',
      subItemSpfAligned: 'SPF aligned',
      subItemDkimAligned: 'DKIM aligned',
      subItemDkimForwarded: 'DKIM forwarded',
      subItemFullyAligned: 'Fully aligned',
      subItemFullyAlignedForwarded: 'Fully aligned forwarded',
      subItemSpfValidNotAligned: 'SPF validated not aligned',
      subItemDkimValidNotAligned: 'DKIM validated not aligned',
      subItemDkimSpfFailed: 'DKIM/SPF failed',
      subItemFailedForwarded: 'Failed forwarded',
      ofTotalTraffic: 'of total traffic',
      flowProportions: 'Aggregate Authentication Flow Proportions',
      dmarcCorrect: 'DMARC Correct',
      authenticatedValid: 'Authenticated Valid',
      invalidFlows: 'Invalid flows',
      authenticated: 'Authenticated',

      // Per Organization (View 4)
      searchMailboxProviders: 'Search reporting mailbox providers...',
      showingOrgs: 'Showing {count} reporting organizations',
      colReportingOrg: 'Reporting Organization',
      colUniqueIps: 'Unique IPs',
      colDispositions: 'Dispositions',
      noOrgsMatch: 'No organization reports match the current filter.',

      // Per Host (View 5)
      passingAlignment: 'Passing domain alignment',
      validRelayFlow: 'Valid key / relay flow',
      impersonationSpoofed: 'Impersonation / spoofed',
      searchHostsPlaceholder: 'Search sending host IP, PTR, country...',
      showingHosts: 'Showing {count} sending hosts',
      colHostnamePtr: 'Hostname (PTR)',
      colCountrySendingIp: 'Country & Sending IP',
      colReceiverPolicy: 'Receiver Policy',
      noHostsMatch: 'No sending hosts match the current search.',
      noPtrRecord: 'No PTR Record',

      // Detailed Stats (View 6)
      showingItemized: 'Showing {count} itemized records',
      colVolume: 'Volume',
      colDisposition: 'Disposition',
      noItemizedMatch: 'No itemized records match the current hostname or IP filters.',
      searchHostname: 'Search Hostname',
      searchIp: 'Search IP address / CIDR',
      searchPlaceholder: 'Search vendors, IPs, hostnames...',

      // Geolocation Report (View 7)
      geoTitle: 'Global Origin Geographic Distribution',
      geoSubtitle: 'Plotted origin coordinates of mail transfer agents delivering mail for monitored domains.',
      threatFailedLabel: 'Threat / Failed',
      threatLabel: 'Threat',
      detectedOriginTitle: 'Detected Origin Locations & Threat Exposure',
      locationsPlotted: '{count} locations plotted',
      colCountryFlag: 'Country & Flag',
      colIpAddress: 'IP Address',
      colPtrHostname: 'PTR Hostname',
      noGeoPoints: 'No geolocation points available.',
      layerDark: 'Carto Dark',
      layerLight: 'Carto Light',
      layerSatellite: 'Satellite',
      resetView: 'Reset View',
      top10Countries: 'Top 10 Countries',
      forwarded: 'DMARC Forwarded',
      recordsNotFound: 'Records not found',

      // Per Country (View 8)
      searchCountryPlaceholder: 'Search origin country or code...',
      showingCountries: 'Showing {count} sending countries',
      colOriginCountry: 'Origin Country',
      colThreatVolume: 'Threat Volume',
      noCountriesMatch: 'No sending country telemetry for current selection.',
      unresolvedCountry: 'Unresolved Country',

      // Date Filters & Actions
      customDate: 'Custom',
      dateFrom: 'From',
      dateTo: 'To',
      applyDateRange: 'Apply',
      customDateRangeLabel: 'Custom Date Range',
      exportCurrentView: 'Generate Full Report with Current Filters',
      refreshViews: 'Refresh Analytics',
      loadingViews: 'Aggregating OpenSearch telemetry...',
      
      // Identity Card
      identityTitle: 'Organization & User Identity',
      identityBadge: 'Report Author & Client',
      identitySubtitle: 'Configure your user logon, organization name, and corporate logo. These credentials are automatically injected into executive PDF cover pages, Excel audit metadata, and client CSV headers.',
      userLogonLabel: 'User Logon / Author Name',
      userLogonHelp: 'Appears as Prepared By / Author on PDF, Excel & CSV reports.',
      orgNameLabel: 'Organization / Client Name',
      orgNameHelp: 'Appears as Prepared For / Client on title blocks.',
      logoLabel: 'Organization Logo (URL or Path)',
      logoHelp: 'Logo rendered on executive PDF title page & sheet headers.',
      saveIdentityBtn: 'Save Identity & Branding',
      savingIdentityBtn: 'Saving Identity...',
      currentIdentity: 'Current report identity:',
      configuredTemplates: 'Configured Branding Templates',
      configuredTemplatesDesc: 'Manage client white-labeling, brand palettes, logos, and custom typography.',
      createNewTemplate: 'Create New Template',
      editTemplate: 'Edit Template',
      deleteTemplate: 'Delete Template',

      // Report Parameters Form
      paramsTitle: 'Report Parameters & Scope',
      domainLabel: 'Monitored Domain',
      timeRangeLabel: 'Time Range Preset',
      preset7d: 'Last 7 Days (Tactical)',
      preset30d: 'Last 30 Days (Standard Audit)',
      preset90d: 'Last 90 Days (Quarterly Executive)',
      presetAll: 'All Ingested Data',
      presetCustom: 'Custom Date Range (Specific Dates)',
      dateFromStart: 'Date From (Start)',
      dateToEnd: 'Date To (End)',
      reporterOrgLabel: 'Reporting Organization',
      allReceivers: 'All Organizations (Google, Microsoft, etc.)',
      dispositionLabel: 'Receiver Policy Disposition',
      allDispositions: 'All Dispositions (none, quarantine, reject)',
      dispNone: 'Only Delivered (none)',
      dispQuarantine: 'Only Quarantined (quarantine)',
      dispReject: 'Only Gateway Blocked (reject)',
      templatePicker: 'Select Branding Template',
      exportFormats: 'Export Formats',
      pdfFormat: 'PDF Document',
      pdfDesc: 'Executive Briefing & Visuals',
      xlsxFormat: 'Excel (.xlsx)',
      xlsxDesc: 'Multi-Sheet & Formatting',
      csvFormat: 'CSV Bundle',
      csvDesc: 'SIEM & Threat Feeds',
      generateBtn: 'Generate & Compile Branded Report',
      generatingBtn: 'Aggregating OpenSearch Telemetry & Generating Branded Assets...',
      
      // Generated Output
      successTitle: 'Report Generated Successfully!',
      targetLabel: 'Target',
      downloadFilesLabel: 'Download Generated Files:',
      downloadPdf: 'Executive PDF',
      downloadXlsx: 'Formatted Excel (.xlsx)',
      downloadCsv: 'Raw CSV Bundle',

      // Template preview
      activeBrandingSpec: 'Active Branding Specification',
      docTitle: 'Document Title',
      clientRecipient: 'Client / Recipient',
      authorEntity: 'Authoring Entity / Logon',
      customOrgTag: '(Custom Org)',
      userLogonTag: '(User Logon)',
      colorSwatches: 'Corporate Color Swatches',
      confidentialityNotice: 'Confidentiality Notice:',

      // History
      historyTitle: 'Audit Report Generation History',
      historySubtitle: 'Complete immutable record of all compiled DMARC executive reports.',
      colTime: 'Timestamp (UTC)',
      colScope: 'Scope / Domain',
      colTemplate: 'Branding Template',
      colAuthor: 'Generated By',
      colMetrics: 'Metrics Snapshot',
      colAssets: 'Download Assets',
      noHistory: 'No reports generated yet. Use the "Generate Report" tab to compile an executive audit.',

      // Schedules
      scheduleTitle: 'Schedule Recurring Report',
      scheduleName: 'Schedule Name',
      targetDomain: 'Target Domain',
      allDomains: 'All Domains',
      cadenceFrequency: 'Cadence / Frequency',
      cadenceDaily: 'Daily (Every morning at 08:00 UTC)',
      cadenceWeekly: 'Weekly (Every Monday at 08:00 UTC)',
      cadenceMonthly: 'Monthly (1st of each month)',
      recipientEmails: 'Recipient Emails',
      saveScheduleBtn: 'Save Automated Schedule',
      activeSchedulesTitle: 'Active Automated Report Jobs',
      noActiveSchedules: 'No automated schedules currently active.',
      runNow: 'Run Now',
      executing: 'Executing...'
    },

    // User Management
    users: {
      title: 'User Access & Account Delegation',
      subtitle: 'Delegate role-based administrative and reporting access to domains and organizations.',
      createUserBtn: 'Create New User',
      colUser: 'User / Identity',
      colEmail: 'Email Address',
      colRole: 'Role',
      colOrg: 'Organization',
      colLanguage: 'Language',
      colDomains: 'Assigned Domains',
      colStatus: 'Status',
      colCreated: 'Created At',
      editUser: 'Edit User',
      deleteUser: 'Delete User',
      modalCreateTitle: 'Create New User Account',
      modalEditTitle: 'Edit User Account',
      emailField: 'Email Address',
      usernameField: 'User Logon / Username',
      orgField: 'Organization / Client Name',
      logoField: 'Organization Logo URL',
      roleField: 'Role Permissions',
      langField: 'Preferred Language',
      domainsField: 'Assigned Monitored Domains',
      passwordField: 'Password',
      passwordHelp: 'Leave blank to retain existing password',
      activeField: 'Account Active'
    },

    // Login
    login: {
      title: 'Sign in to DMARC Sentinel',
      subtitle: 'Enter your credentials to access the enterprise authentication console.',
      emailOrUser: 'Email Address or Username',
      password: 'Password',
      signInBtn: 'Sign In to Security Console',
      signingInBtn: 'Authenticating...',
      securityNote: 'Protected by strict rate-limiting, JWT authentication, and scoped role-based access control.'
    }
  },

  es: {
    // Navigation & Header
    nav: {
      brand: 'DMARC',
      brandSuffix: 'Sentinel',
      live: 'EN VIVO',
      tagline: 'Autenticación de Correo Empresarial y Control de Acceso',
      overview: 'Resumen',
      health: 'Salud del Dominio',
      alignment: 'Autenticación y Alineación',
      threats: 'Inteligencia de Amenazas',
      policies: 'Políticas y Preparación',
      reports: 'Informes',
      records: 'Explorador de Registros',
      users: 'Control de Acceso',
      allDomains: 'Todos los Dominios Monitoreados',
      refresh: 'Actualizar datos de OpenSearch',
      profile: 'Perfil y Preferencias',
      manageUsers: 'Gestionar Usuarios y Accesos',
      changePassword: 'Cambiar Contraseña',
      signOut: 'Cerrar Sesión',
      roleAdmin: 'Super Administrador',
      roleManager: 'Gerente',
      roleViewer: 'Espectador',
      language: 'Idioma',
      switchLanguage: 'Cambiar a Inglés (English)',
      languageName: 'Español',
      navigation: 'Navegación',
      monitoredDomain: 'Ámbito Monitoreado',
      systemControls: 'Controles del Sistema'
    },

    // User Profile Modal
    profileModal: {
      title: 'Perfil de Usuario y Preferencias',
      subtitle: 'Administre su inicio de sesión, identidad de organización e idioma del sistema',
      logonLabel: 'Nombre de Usuario / Inicio de Sesión',
      logonHelp: 'Su identidad como autor en informes ejecutivos y registros de auditoría.',
      emailLabel: 'Correo Electrónico Registrado',
      orgLabel: 'Nombre de Organización / Cliente',
      orgHelp: 'Entidad corporativa o cliente que aparece en portadas de informes personalizados.',
      logoLabel: 'URL o Ruta del Logotipo Corporativo',
      logoHelp: 'Ej. templates/assets/sentinel_logo.png o http://...',
      languageLabel: 'Idioma del Sistema',
      languageHelp: 'Seleccione su idioma preferido para la consola y los informes generados.',
      themeLabel: 'Tema de Interfaz y Paleta de Colores',
      themeHelp: 'Seleccione su preferencia visual. Los temas claros ofrecen un contraste ejecutivo óptimo en entornos con luz natural.',
      themes: {
        dark: {
          name: 'Cyber Dark',
          desc: 'Clásico SOC nocturno con acentos cian'
        },
        light: {
          name: 'Executive Light',
          desc: 'Corporativo impecable en blanco y pizarra'
        },
        nordic: {
          name: 'Nordic Frost',
          desc: 'Azul polar con reflejos árticos y hielo'
        },
        emerald: {
          name: 'Emerald Sentinel',
          desc: 'Seguridad y confianza en salvia y bosque'
        }
      },
      saveBtn: 'Guardar Perfil y Preferencias',
      savingBtn: 'Guardando Preferencias...',
      successMsg: '¡Perfil y preferencias guardados exitosamente!',
      errorMsg: 'Error al actualizar el perfil de usuario.'
    },

    // Common UI terms
    common: {
      loading: 'Cargando datos...',
      save: 'Guardar',
      saving: 'Guardando...',
      cancel: 'Cancelar',
      close: 'Cerrar',
      delete: 'Eliminar',
      edit: 'Editar',
      create: 'Crear',
      search: 'Buscar...',
      filter: 'Filtrar',
      export: 'Exportar',
      status: 'Estado',
      actions: 'Acciones',
      all: 'Todos',
      domain: 'Dominio',
      volume: 'Volumen',
      date: 'Fecha',
      pass: 'APROBADO',
      fail: 'FALLIDO',
      none: 'Ninguna (none)',
      quarantine: 'Cuarentena (quarantine)',
      reject: 'Rechazo (reject)',
      legitimate: 'Legítimo',
      suspicious: 'Sospechoso',
      misconfigured: 'Desconfigurado',
      active: 'Activo',
      inactive: 'Inactivo',
      na: 'N/D',
      yes: 'Sí',
      no: 'No',
      refresh: 'Actualizar',
      compliant: 'Conforme'
    },

    // Filter controls
    filters: {
      allDomains: 'Todos los Dominios Monitoreados'
    },

    // KPIs & Executive Overview
    kpi: {
      title: 'Resumen de Métricas Ejecutivas',
      totalMessages: 'Total de Mensajes',
      totalMessagesDesc: 'Volumen total de correo procesado',
      passRate: 'Tasa de Aprobación DMARC',
      passRateDesc: 'Porcentaje de conformidad con RFC 7489',
      compliantVolume: 'Mensajes Conformes',
      compliantVolumeDesc: 'Correo corporativo legítimo alineado',
      unalignedThreats: 'No Alineados / Amenazas',
      unalignedThreatsDesc: 'Intentos de suplantación o correo desconfigurado',
      deliveryRate: 'Entregados (p=none)',
      deliveryRateDesc: 'Entrega permitida en bandeja de entrada',
      quarantined: 'En Cuarentena (spam)',
      quarantinedDesc: 'Desviados a la carpeta de correo no deseado',
      blocked: 'Bloqueados en Gateway',
      blockedDesc: 'Rechazados en el servidor de correo'
    },

    // Auth & Alignment
    alignment: {
      title: 'Matriz de Autenticación y Alineación',
      subtitle: 'Correlación de autenticación SPF y DKIM con los requisitos de alineación RFC 7489',
      bothAligned: 'Ambos Alineados (Aprobado/Aprobado)',
      spfOnly: 'SPF Aprobado & DKIM Fallido',
      dkimOnly: 'SPF Fallido & DKIM Aprobado',
      neither: 'SPF Fallido & DKIM Fallido (Suplantación Total)',
      spfAlignmentRate: 'Tasa de Alineación SPF',
      dkimAlignmentRate: 'Tasa de Alineación DKIM',
      dispositionBreakdown: 'Desglose de Aplicación de Políticas del Receptor',
      compliantVerdict: 'Tráfico Corporativo Totalmente Conforme',
      spfDkimComparison: 'Comparativa de la Matriz de Alineación'
    },

    // Volume & Trends
    trends: {
      title: 'Volumen de Correo y Tasa de Aprobación en el Tiempo',
      subtitle: 'Volumen diario de correo y porcentaje de cumplimiento de autenticación',
      totalVolume: 'Total de Mensajes',
      passedVolume: 'Conforme (Aprobado)',
      failedVolume: 'Fallido (Suplantación/Amenaza)',
      passRatePercent: 'Tasa de Aprobación (%)',
      noData: 'No hay datos de series temporales disponibles para el filtro seleccionado.'
    },

    // Traffic & Senders
    senders: {
      title: 'Infraestructura de Envío e Inventario de Servicios',
      subtitle: 'Identificación de proveedores ESP, reenviadores y sistemas de envío directo',
      senderDomain: 'Dominio Base / ESP',
      serviceName: 'Proveedor de Servicio',
      volume: 'Volumen de Mensajes',
      passRate: 'Tasa de Aprobación',
      classification: 'Clasificación',
      legitHelp: 'Infraestructura corporativa o en la nube autorizada',
      misconfigHelp: 'Proveedor conocido con fallas en SPF o DKIM',
      suspiciousHelp: 'Infraestructura no autorizada intentando suplantar el dominio'
    },

    // Threat Intelligence
    threats: {
      title: 'Inteligencia de Amenazas y Cazador de Suplantación',
      subtitle: 'Rastreo de IPs no autorizadas e infraestructura maliciosa que envía a nombre de su dominio',
      highRiskIPs: 'Fuentes de IP de Alto Riesgo No Alineadas',
      sourceIp: 'Dirección IP de Origen',
      reverseDns: 'DNS Inverso (PTR)',
      country: 'País / Ubicación',
      asnNetwork: 'Sistema Autónomo (ASN)',
      spoofedVolume: 'Mensajes Suplantados',
      verdict: 'Veredicto de Amenaza',
      threatConfirmed: 'Suplantación Confirmada',
      noThreats: 'No se detectaron fuentes de suplantación críticas en el alcance actual.'
    },

    // Policies & Readiness
    policies: {
      title: 'Preparación del Dominio y Ruta de Aplicación',
      subtitle: 'Ruta progresiva para avanzar dominios de p=none a p=quarantine y p=reject',
      domainName: 'Dominio Monitoreado',
      currentPolicy: 'Política Actual',
      recommendedPolicy: 'Recomendación de Aplicación',
      complianceScore: 'Tasa de Cumplimiento',
      statusVerdict: 'Veredicto de Preparación',
      readyReject: 'Listo para p=reject (Bloqueo Estricto)',
      readyQuarantine: 'Listo para p=quarantine',
      needsAlignment: 'Requiere Alineación Antes de Aplicar Bloqueo',
      protected: 'Totalmente Protegido en p=reject'
    },

    // Raw Logs
    rawLogs: {
      title: 'Explorador de Registros Agregados DMARC en OpenSearch',
      subtitle: 'Inspección directa de registros agregados individuales en OpenSearch',
      searchPlaceholder: 'Filtrar registros por IP, dominio, selector o disposición...',
      exportJson: 'Exportar JSON',
      sourceIp: 'IP de Origen',
      headerFrom: 'Cabecera From',
      reporter: 'Org Notificadora',
      spfResult: 'Resultado SPF',
      dkimResult: 'Resultado DKIM',
      dmarcResult: 'DMARC',
      messages: 'Cantidad',
      disposition: 'Disposición',
      timestamp: 'Marca de Tiempo'
    },

    // Domain Health Diagnostics
    health: {
      title: 'Diagnóstico de Salud DNS y Seguridad de Correo',
      subtitle: 'Verificación en vivo de registros DNS: MX, SPF, DKIM, DMARC y BIMI',
      selectDomain: 'Dominio Monitoreado (de OpenSearch)',
      domainsAvailable: 'disponibles',
      customDomain: 'Auditar Otro Dominio Personalizado...',
      monitoredDomains: 'Dominios Monitoreados:',
      quickSelect: 'Selección rápida:',
      noDomainsFound: 'No se encontraron dominios permitidos en OpenSearch',
      enterDomain: 'Ingrese nombre de dominio (ej. example.com)...',
      dkimSelector: 'Selector DKIM (Opcional)',
      runAudit: 'Analizar Dominio',
      auditing: 'Auditando DNS...',
      mxTitle: 'Registros de Intercambio de Correo (MX)',
      spfTitle: 'Marco de Políticas del Remitente (SPF)',
      dkimTitle: 'Correo Identificado por Claves de Dominio (DKIM)',
      dmarcTitle: 'Sintaxis y Política del Registro DMARC',
      bimiTitle: 'Indicadores de Marca para Identificación (BIMI)',
      overallScore: 'Puntuación de Salud de Seguridad',
      recordFound: 'Registro Válido y Activo',
      recordMissing: 'Registro Faltante o Inválido'
    },

    // Reports Dashboard
    reports: {
      engineBadge: 'MOTOR DE INFORMES EMPRESARIAL',
      title: 'Informes Ejecutivos de DMARC Personalizados',
      subtitle: 'Genere informes profesionales para clientes en formatos PDF, Excel (.xlsx) y CSV con identidad corporativa, logotipo, veredicto de preparación y marca blanca.',
      aggregateTab: 'Vistas Agregadas (PowerDMARC)',
      generateTab: 'Generar Informe',
      brandingTab: 'Identidad y Plantillas',
      historyTab: 'Historial de Informes',
      schedulesTab: 'Programaciones Automáticas',
      
      // PowerDMARC Aggregate 8-Views
      aggregateTitle: 'Suite de Informes Agregados DMARC (PowerDMARC)',
      aggregateSubtitle: 'Réplica exacta de la suite de informes de PowerDMARC: Panel Ejecutivo Nueva Versión, Por Fuente de Envío, Por Resultado, Por Organización, Por Host, Estadísticas Detalladas, Informe de Geolocalización y Por País.',
      viewNewVersion: 'Nueva Versión (Beta)',
      viewPerSource: 'Por Fuente de Envío',
      viewPerResult: 'Por Resultado',
      viewPerOrg: 'Por Organización',
      viewPerHost: 'Por Host',
      viewDetailed: 'Estadísticas Detalladas',
      viewGeolocation: 'Informe de Geolocalización',
      viewPerCountry: 'Por País',

      // KPI Cards
      totalVolume: 'Volumen Total',
      totalVolumeDesc: 'Mensajes de correo agregados',
      dmarcCompliant: 'DMARC Conforme',
      alignedMessages: 'mensajes alineados',
      forwarded: 'Reenviados',
      indirectRelays: 'retransmisiones indirectas',
      failed: 'Fallidos',
      unalignedThreats: 'no alineados / amenazas',

      // Charts & Summaries
      resultsOverview: 'Resumen de Resultados',
      timelineDesc: 'Desglose diario de entrega y autenticación durante el período seleccionado.',
      noTimeline: 'No hay telemetría de línea de tiempo para la ventana seleccionada.',
      topSendingSources: 'Principales Fuentes de Envío',
      volumeDistDesc: 'Distribución de volumen por servicio de correo detectado.',
      overallScore: 'Puntuación Global',
      compliant: 'Conforme',
      total: 'Total',

      // Sending Sources Overview Table (View 1 & 2)
      sendingSourcesOverview: 'Resumen de Fuentes de Envío',
      sendingSourcesOverviewDesc: 'Desglose de alto nivel de todos los proveedores de envío identificados en los reportes agregados DMARC.',
      viewFullPerSource: 'Ver Explorador Completo por Fuente',
      colSendingSource: 'Fuente de Envío',
      colSourceType: 'Tipo de Fuente',
      colTotalMessages: 'Total de Mensajes',
      colDmarcCompliant: 'Conforme con DMARC',
      colDkimVerification: 'Verificación DKIM',
      colSpfVerification: 'Verificación SPF',
      colMessages: 'Mensajes',
      colDmarcCompliance: 'Cumplimiento DMARC',
      noSourcesMatch: 'Ninguna fuente de envío coincide con el filtro actual.',
      directServer: 'Servidor Directo',

      // Filter Cards (View 2)
      dmarcCompatibleSources: 'Fuentes compatibles con DMARC',
      forwardedSources: 'Reenviados',
      failedSources: 'Fallidos',
      authorizedSystemsDesc: 'Sistemas de correo autorizados que pasan la autenticación',
      intermediaryRelaysDesc: 'Retransmisores intermediarios que mantienen firmas DKIM intactas',
      shadowItDesc: 'Sistemas no autorizados o suplantadores que fallan ambas comprobaciones',
      showingSources: 'Mostrando {filtered} de {total} fuentes de envío',

      // Nested Rows (View 2)
      sendingHostsFor: 'Nombres de Host e IPs de Envío para {name}',
      hostRecordsCount: '{count} registros de host',
      colSenderHostname: 'Nombre de Host del Remitente',
      colCountryIp: 'País y Dirección IP',
      colCompliant: 'Conforme',
      colDkimStatus: 'Estado DKIM',
      colSpfStatus: 'Estado SPF',
      noHostIps: 'No hay IPs individuales registradas para esta fuente.',
      aligned: 'Alineado',
      unaligned: 'No Alineado',
      yes: 'Sí',
      no: 'No',

      // Per Result (View 3)
      resultGroupCorrect: 'DMARC correcto - DKIM o SPF alineado',
      resultGroupAuthenticated: 'Autenticado - DKIM o SPF válido',
      resultGroupInvalid: 'Flujos inválidos - DKIM y SPF inválidos',
      subItemSpfAligned: 'SPF alineado',
      subItemDkimAligned: 'DKIM alineado',
      subItemDkimForwarded: 'DKIM reenviado',
      subItemFullyAligned: 'Totalmente alineado',
      subItemFullyAlignedForwarded: 'Totalmente alineado reenviado',
      subItemSpfValidNotAligned: 'SPF validado no alineado',
      subItemDkimValidNotAligned: 'DKIM validado no alineado',
      subItemDkimSpfFailed: 'DKIM/SPF fallido',
      subItemFailedForwarded: 'Fallido reenviado',
      ofTotalTraffic: 'del tráfico total',
      flowProportions: 'Proporciones de Flujo de Autenticación Agregada',
      dmarcCorrect: 'DMARC Correcto',
      authenticatedValid: 'Autenticado Válido',
      invalidFlows: 'Flujos Inválidos',
      authenticated: 'Autenticado',

      // Per Organization (View 4)
      searchMailboxProviders: 'Buscar proveedores de buzón receptores...',
      showingOrgs: 'Mostrando {count} organizaciones notificadoras',
      colReportingOrg: 'Organización Notificadora',
      colUniqueIps: 'IPs Únicas',
      colDispositions: 'Disposiciones',
      noOrgsMatch: 'Ningún informe de organización coincide con el filtro actual.',

      // Per Host (View 5)
      passingAlignment: 'Pasa la alineación de dominio',
      validRelayFlow: 'Clave válida / flujo de retransmisión',
      impersonationSpoofed: 'Suplantación / falso',
      searchHostsPlaceholder: 'Buscar IP de host, PTR, país...',
      showingHosts: 'Mostrando {count} hosts de envío',
      colHostnamePtr: 'Nombre de Host (PTR)',
      colCountrySendingIp: 'País e IP de Envío',
      colReceiverPolicy: 'Política del Receptor',
      noHostsMatch: 'Ningún host de envío coincide con la búsqueda actual.',
      noPtrRecord: 'Sin Registro PTR',

      // Detailed Stats (View 6)
      showingItemized: 'Mostrando {count} registros detallados',
      colVolume: 'Volumen',
      colDisposition: 'Disposición',
      noItemizedMatch: 'Ningún registro coincide con los filtros de host o IP actuales.',
      searchHostname: 'Buscar Nombre de Host',
      searchIp: 'Buscar Dirección IP / CIDR',
      searchPlaceholder: 'Buscar proveedores, IPs, hosts...',

      // Geolocation Report (View 7)
      geoTitle: 'Distribución Geográfica Global de Origen',
      geoSubtitle: 'Coordenadas de origen trazadas de agentes de transferencia de correo para los dominios monitoreados.',
      threatFailedLabel: 'Amenaza / Fallido',
      threatLabel: 'Amenaza',
      detectedOriginTitle: 'Ubicaciones de Origen Detectadas y Exposición a Amenazas',
      locationsPlotted: '{count} ubicaciones trazadas',
      colCountryFlag: 'País y Bandera',
      colIpAddress: 'Dirección IP',
      colPtrHostname: 'Nombre de Host PTR',
      noGeoPoints: 'No hay puntos de geolocalización disponibles.',
      layerDark: 'Carto Oscuro',
      layerLight: 'Carto Claro',
      layerSatellite: 'Satélite',
      resetView: 'Restablecer',
      top10Countries: '10 Principales Países',
      forwarded: 'DMARC Reenviado',
      recordsNotFound: 'Sin registros encontrados',

      // Per Country (View 8)
      searchCountryPlaceholder: 'Buscar país o código de origen...',
      showingCountries: 'Mostrando {count} países de envío',
      colOriginCountry: 'País de Origen',
      colThreatVolume: 'Volumen de Amenazas',
      noCountriesMatch: 'No hay telemetría de países de envío para la selección actual.',
      unresolvedCountry: 'País No Resuelto',

      // Date Filters & Actions
      customDate: 'Personalizado',
      dateFrom: 'Desde',
      dateTo: 'Hasta',
      applyDateRange: 'Aplicar',
      customDateRangeLabel: 'Rango de Fechas Personalizado',
      exportCurrentView: 'Generar Informe Completo con Filtros Actuales',
      refreshViews: 'Actualizar Analíticas',
      loadingViews: 'Agregando telemetría de OpenSearch...',
      
      // Identity Card
      identityTitle: 'Identidad de Organización y Usuario',
      identityBadge: 'Autor y Cliente del Informe',
      identitySubtitle: 'Configure su inicio de sesión, nombre de organización y logotipo corporativo. Estas credenciales se inyectan automáticamente en las portadas PDF ejecutivas, metadatos de Excel y encabezados CSV.',
      userLogonLabel: 'Nombre de Usuario / Autor',
      userLogonHelp: 'Aparece como Preparado Por / Autor en informes PDF, Excel y CSV.',
      orgNameLabel: 'Nombre de Organización / Cliente',
      orgNameHelp: 'Aparece como Preparado Para / Cliente en portadas y bloques de título.',
      logoLabel: 'Logotipo de la Organización (URL o Ruta)',
      logoHelp: 'Logotipo renderizado en la página de título PDF y encabezados de hojas.',
      saveIdentityBtn: 'Guardar Identidad y Marca',
      savingIdentityBtn: 'Guardando Identidad...',
      currentIdentity: 'Identidad actual del informe:',
      configuredTemplates: 'Plantillas de Marca Configuradas',
      configuredTemplatesDesc: 'Gestione marca blanca para clientes, paletas de colores, logotipos y tipografía.',
      createNewTemplate: 'Crear Nueva Plantilla',
      editTemplate: 'Editar Plantilla',
      deleteTemplate: 'Eliminar Plantilla',

      // Report Parameters Form
      paramsTitle: 'Parámetros y Alcance del Informe',
      domainLabel: 'Dominio Monitoreado',
      timeRangeLabel: 'Rango de Tiempo',
      preset7d: 'Últimos 7 Días (Táctico)',
      preset30d: 'Últimos 30 Días (Auditoría Estándar)',
      preset90d: 'Últimos 90 Días (Ejecutivo Trimestral)',
      presetAll: 'Todos los Datos Ingeridos',
      presetCustom: 'Rango de Fechas Personalizado',
      dateFromStart: 'Fecha Desde (Inicio)',
      dateToEnd: 'Fecha Hasta (Fin)',
      reporterOrgLabel: 'Organización Notificadora',
      allReceivers: 'Todas las Organizaciones (Google, Microsoft, etc.)',
      dispositionLabel: 'Disposición de Política del Receptor',
      allDispositions: 'Todas las Disposiciones (none, quarantine, reject)',
      dispNone: 'Solo Entregados (none)',
      dispQuarantine: 'Solo en Cuarentena (quarantine)',
      dispReject: 'Solo Bloqueados en Gateway (reject)',
      templatePicker: 'Seleccionar Plantilla de Marca',
      exportFormats: 'Formatos de Exportación',
      pdfFormat: 'Documento PDF',
      pdfDesc: 'Presentación Ejecutiva y Visualizaciones',
      xlsxFormat: 'Excel (.xlsx)',
      xlsxDesc: 'Multi-Hoja y Formato Avanzado',
      csvFormat: 'Paquete CSV',
      csvDesc: 'Fuentes de Amenazas y SIEM',
      generateBtn: 'Generar y Compilar Informe Personalizado',
      generatingBtn: 'Agregando Telemetría de OpenSearch y Generando Activos...',
      
      // Generated Output
      successTitle: '¡Informe Generado Exitosamente!',
      targetLabel: 'Objetivo',
      downloadFilesLabel: 'Descargar Archivos Generados:',
      downloadPdf: 'PDF Ejecutivo',
      downloadXlsx: 'Excel Formateado (.xlsx)',
      downloadCsv: 'Paquete CSV',

      // Template preview
      activeBrandingSpec: 'Especificación de Marca Activa',
      docTitle: 'Título del Documento',
      clientRecipient: 'Cliente / Destinatario',
      authorEntity: 'Entidad de Autoría / Usuario',
      customOrgTag: '(Organización Personalizada)',
      userLogonTag: '(Usuario de Inicio de Sesión)',
      colorSwatches: 'Muestras de Color Corporativo',
      confidentialityNotice: 'Aviso de Confidencialidad:',

      // History
      historyTitle: 'Historial de Generación de Informes de Auditoría',
      historySubtitle: 'Registro inmutable completo de todos los informes ejecutivos de DMARC compilados.',
      colTime: 'Marca de Tiempo (UTC)',
      colScope: 'Alcance / Dominio',
      colTemplate: 'Plantilla de Marca',
      colAuthor: 'Generado Por',
      colMetrics: 'Resumen de Métricas',
      colAssets: 'Descargar Archivos',
      noHistory: 'Aún no se han generado informes. Use la pestaña "Generar Informe" para compilar una auditoría.',

      // Schedules
      scheduleTitle: 'Programar Informe Periódico',
      scheduleName: 'Nombre de la Programación',
      targetDomain: 'Dominio Objetivo',
      allDomains: 'Todos los Dominios',
      cadenceFrequency: 'Cadencia / Frecuencia',
      cadenceDaily: 'Diario (Cada mañana a las 08:00 UTC)',
      cadenceWeekly: 'Semanal (Cada lunes a las 08:00 UTC)',
      cadenceMonthly: 'Mensual (Día 1 de cada mes)',
      recipientEmails: 'Correos de Destinatarios',
      saveScheduleBtn: 'Guardar Programación Automática',
      activeSchedulesTitle: 'Trabajos de Informes Automáticos Activos',
      noActiveSchedules: 'No hay programaciones automáticas activas en este momento.',
      runNow: 'Ejecutar Ahora',
      executing: 'Ejecutando...'
    },

    // User Management
    users: {
      title: 'Control de Acceso y Delegación de Usuarios',
      subtitle: 'Delegue acceso administrativo y de informes basado en roles para dominios y organizaciones.',
      createUserBtn: 'Crear Nuevo Usuario',
      colUser: 'Usuario / Identidad',
      colEmail: 'Dirección de Correo',
      colRole: 'Rol',
      colOrg: 'Organización',
      colLanguage: 'Idioma',
      colDomains: 'Dominios Asignados',
      colStatus: 'Estado',
      colCreated: 'Fecha de Creación',
      editUser: 'Editar Usuario',
      deleteUser: 'Eliminar Usuario',
      modalCreateTitle: 'Crear Nueva Cuenta de Usuario',
      modalEditTitle: 'Editar Cuenta de Usuario',
      emailField: 'Dirección de Correo',
      usernameField: 'Nombre de Usuario / Inicio de Sesión',
      orgField: 'Nombre de Organización / Cliente',
      logoField: 'URL del Logotipo de Organización',
      roleField: 'Permisos del Rol',
      langField: 'Idioma Preferido',
      domainsField: 'Dominios Monitoreados Asignados',
      passwordField: 'Contraseña',
      passwordHelp: 'Deje en blanco para conservar la contraseña actual',
      activeField: 'Cuenta Activa'
    },

    // Login
    login: {
      title: 'Iniciar sesión en DMARC Sentinel',
      subtitle: 'Ingrese sus credenciales para acceder a la consola de seguridad empresarial.',
      emailOrUser: 'Correo Electrónico o Nombre de Usuario',
      password: 'Contraseña',
      signInBtn: 'Iniciar Sesión en la Consola',
      signingInBtn: 'Autenticando...',
      securityNote: 'Protegido por limitación de tasa estricta, tokens JWT y control de acceso basado en roles.'
    }
  }
};
