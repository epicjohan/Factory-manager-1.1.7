
migrate((db) => {
  const collections = [
    { 
      name: "system_config", 
      type: "base", 
      fields: [
        { name: "systemVersion", type: "text" }, 
        { name: "companyName", type: "text" }, 
        { name: "activeModules", type: "json" }, 
        { name: "teamsWebhook", type: "text" }, 
        { name: "notificationEmails", type: "json" }, 
        { name: "maintenanceMode", type: "bool" }, 
        { name: "lastUpdated", type: "date" }
      ] 
    },
    { 
      name: "mkg_operations", 
      type: "base", 
      fields: [
        { name: "code", type: "text", required: true }, 
        { name: "name", type: "text", required: true }, 
        { name: "category", type: "text" },
        { name: "default_machine_id", type: "text" },
        { name: "default_machine_type", type: "text" }
      ] 
    },
    { 
      name: "energy_settings", 
      type: "base", 
      fields: [
        { name: "kwhPrice", type: "number" }, 
        { name: "maxPowerLimit", type: "number" }, 
        { name: "co2Factor", type: "number" }
      ] 
    },
    { 
      name: "energy_historical", 
      type: "base", 
      fields: [
        { name: "timestamp", type: "date" }, 
        { name: "consumption_wh", type: "number" }, 
        { name: "production_wh", type: "number" }, 
        { name: "avg_consumption_w", type: "number" }, 
        { name: "avg_production_w", type: "number" }, 
        { name: "peak_w", type: "number" }
      ] 
    },
    { 
      name: "energy_live", 
      type: "base", 
      fields: [
        { name: "active_power_w", type: "number" }, 
        { name: "production_w", type: "number" },
        { name: "net_power_w", type: "number" },
        { name: "total_kwh", type: "number" }, 
        { name: "total_production_kwh", type: "number" },
        { name: "l1_amp", type: "number" }, 
        { name: "l2_amp", type: "number" }, 
        { name: "l3_amp", type: "number" }, 
        { name: "updated", type: "date" }
      ] 
    },
    { 
      name: "machines", 
      type: "base", 
      fields: [
        { name: "machineNumber", type: "text", required: true }, 
        { name: "name", type: "text", required: true }, 
        { name: "type", type: "text" }, 
        { name: "status", type: "text" }, 
        { name: "image", type: "file", options: { maxSelect: 1 } }, 
        { name: "focasIp", type: "text" }, 
        { name: "focasPort", type: "number" },
        { name: "protocol", type: "text" },
        { name: "mtConnectUrl", type: "text" },
        { name: "liveStats", type: "json" }, 
        { name: "toolStats", type: "json" }, 
        { name: "tankCapacity", type: "number" },
        { name: "coolantTarget", type: "number" },
        { name: "showInDashboard", type: "bool" },
        { name: "showInAndon", type: "bool" },
        { name: "andonConfig", type: "json" },
        { name: "scheduleId", type: "text" },
        { name: "documents", type: "file", options: { maxSelect: 99 } },
        { name: "isArchived", type: "bool" }
      ] 
    },
    { 
      name: "app_users", 
      type: "base", 
      fields: [
        { name: "name", type: "text", required: true }, 
        { name: "pinCode", type: "text", required: true }, 
        { name: "role", type: "text", required: true }, 
        { name: "permissions", type: "json" }, 
        { name: "allowedTabs", type: "json" }, 
        { name: "allowedModules", type: "json" },
        { name: "allowedAssetIds", type: "json" },
        { name: "restrictedAccess", type: "bool" }, 
        { name: "defaultPath", type: "text" }
      ] 
    },
    { 
      name: "tickets", 
      type: "base", 
      fields: [
        { name: "machineId", type: "text", required: true }, 
        { name: "title", type: "text", required: true }, 
        { name: "description", type: "text" }, 
        { name: "status", type: "text" }, 
        { name: "impact", type: "text" }, 
        { name: "reportedBy", type: "text" }, 
        { name: "reportedDate", type: "date" }, 
        { name: "actions", type: "json" }, 
        { name: "usedParts", type: "json" }, 
        { name: "repairCost", type: "number" }, 
        { name: "downtimeMinutes", type: "number" }, 
        { name: "resolvedBy", type: "text" }, 
        { name: "resolvedDate", type: "date" },
        { name: "resolvedCompany", type: "text" },
        { name: "invoice", type: "file", options: { maxSelect: 1 } }
      ] 
    },
    { 
      name: "support_requests", 
      type: "base", 
      fields: [
        { name: "type", type: "text", required: true }, 
        { name: "status", type: "text", required: true }, 
        { name: "machineId", type: "text" }, 
        { name: "message", type: "text" }, 
        { name: "urgency", type: "text" }, 
        { name: "requestDate", type: "date" }, 
        { name: "requester", type: "text" }, 
        { name: "acceptedBy", type: "text" }, 
        { name: "completedBy", type: "text" }, 
        { name: "completedDate", type: "date" },
        { name: "location", type: "text" }, 
        { name: "desiredTime", type: "text" },
        { name: "targetManager", type: "text" },
        { name: "answer", type: "text" }
      ] 
    },
    { 
      name: "snapshots", 
      type: "base", 
      fields: [
        { name: "name", type: "text", required: true },
        { name: "timestamp", type: "date" },
        { name: "data", type: "text" },
        { name: "type", type: "text" }
      ] 
    },
    { name: "machine_parts", type: "base", fields: [{ name: "machineId", type: "text", required: true }, { name: "description", type: "text", required: true }, { name: "articleCode", type: "text" }, { name: "stock", type: "number" }, { name: "minStock", type: "number" }, { name: "price", type: "number" }, { name: "location", type: "text" }, { name: "supplier", type: "text" }] },
    { name: "general_parts", type: "base", fields: [{ name: "description", type: "text", required: true }, { name: "articleCode", type: "text" }, { name: "stock", type: "number" }, { name: "minStock", type: "number" }, { name: "price", type: "number" }, { name: "location", type: "text" }, { name: "supplier", type: "text" }] },
    { name: "schedules", type: "base", fields: [{ name: "name", type: "text", required: true }, { name: "shifts", type: "json" }] },
    { name: "checklist_logs", type: "base", fields: [{ name: "machineId", type: "text", required: true }, { name: "checklistItemId", type: "text", required: true }, { name: "status", type: "text", required: true }, { name: "checkedBy", type: "text" }, { name: "date", type: "date", required: true }] },
    { name: "mixing_logs", type: "base", fields: [{ name: "machineId", type: "text", required: true }, { name: "percentage", type: "number" }, { name: "type", type: "text" }, { name: "performedBy", type: "text" }, { name: "actionTaken", type: "bool" }, { name: "notes", type: "text" }, { name: "date", type: "date", required: true }] },
    { name: "mist_logs", type: "base", fields: [{ name: "machineId", type: "text", required: true }, { name: "stage", type: "text" }, { name: "replacedBy", type: "text" }, { name: "remark", type: "text" }, { name: "partId", type: "text" }, { name: "cost", type: "number" }, { name: "date", type: "date", required: true }] },
    { name: "efficiency_logs", type: "base", fields: [{ name: "machineId", type: "text", required: true }, { name: "date", type: "date", required: true }, { name: "oee", type: "number" }, { name: "availability", type: "number" }, { name: "performance", type: "number" }, { name: "quality", type: "number" }, { name: "operatingMinutes", type: "number" }, { name: "cuttingMinutes", type: "number" }, { name: "partsProduced", type: "number" }] },
    { name: "maintenance_events", type: "base", fields: [{ name: "machineId", type: "text", required: true }, { name: "title", type: "text", required: true }, { name: "date", type: "date", required: true }, { name: "status", type: "text" }, { name: "assignedTo", type: "text" }] },
    { name: "system_status", type: "base", fields: [{ name: "bridge_name", type: "text", required: true }, { name: "status", type: "text" }, { name: "last_seen", type: "date" }] },
    { name: "system_audit_logs", type: "base", fields: [{ name: "action", type: "text", required: true }, { name: "userId", type: "text" }, { name: "details", type: "text" }, { name: "created", type: "date" }] },
    { 
      name: "articles", 
      type: "base", 
      fields: [
        { name: "articleCode", type: "text" }, 
        { name: "revision", type: "text" }, 
        { name: "name", type: "text" }, 
        { name: "description2", type: "text" }, 
        { name: "drawingNumber", type: "text" }, 
        { name: "drawingRevision", type: "text" }, 
        { name: "posNumber", type: "text" }, 
        { name: "status", type: "text" }, 
        { name: "isLocked", type: "bool" }, 
        { name: "operations", type: "json" }, 
        { name: "bomItems", type: "json" }, 
        { name: "files", type: "json" }, 
        { name: "auditTrail", type: "json" }, 
        { name: "changeReason", type: "text" }, 
        { name: "previousRevisionId", type: "text" }, 
        { name: "updatedBy", type: "text" }
      ] 
    },
    {
      name: "setup_templates",
      type: "base",
      fields: [
        { name: "name", type: "text" },
        { name: "assetType", type: "text" },
        { name: "description", type: "text" },
        { name: "fields", type: "json" },
        { name: "toolFields", type: "json" },
        { name: "isDefault", type: "bool" }
      ]
    }
  ];

  collections.forEach((c) => {
    try {
      const collection = new Collection(c);
      collection.listRule = "";
      collection.viewRule = "";
      collection.createRule = "";
      collection.updateRule = "";
      collection.deleteRule = "";
      db.saveCollection(collection);
    } catch (e) {}
  });
}, (db) => {})
