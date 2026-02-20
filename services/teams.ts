
import { db } from "./storage";
import { User, TicketImpact } from "../types";

export type TeamsUrgency = 'NORMAL' | 'HIGH';

export const TeamsService = {
    /**
     * Sends an Adaptive Card to the configured Teams Webhook
     */
    sendQuestion: async (
        user: User, 
        subject: string, 
        message: string, 
        urgency: TeamsUrgency, 
        locationInfo?: string,
        machineName?: string,
        targetManager?: string // NEW PARAMETER
    ): Promise<{ success: boolean; message: string }> => {
        
        // --- FIX: getTeamsWebhookUrl is async and needs to be awaited ---
        const webhookUrl = await db.getTeamsWebhookUrl();

        if (!webhookUrl) {
            return { success: false, message: "Teams Webhook URL is niet ingesteld. Vraag de beheerder." };
        }

        // Determine colors and accent based on urgency
        const isHigh = urgency === 'HIGH';
        const accentColor = isHigh ? "C4314B" : "0078D7"; // Red vs Blue
        const titlePrefix = isHigh ? "🛑 SPOED: " : "ℹ️ ";

        // Build Facts array dynamically
        const facts = [];
        
        if (targetManager) {
            facts.push({ title: "Voor:", value: targetManager });
        }

        if (machineName) {
            facts.push({ title: "Machine:", value: machineName });
        }
        
        if (locationInfo) {
            facts.push({ title: "Locatie/Info:", value: locationInfo });
        }

        facts.push({ title: "Tijdstip:", value: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) });

        // Construct Adaptive Card Payload
        const cardPayload = {
            type: "message",
            attachments: [
                {
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.4",
                        "body": [
                            {
                                "type": "Container",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "text": `${titlePrefix}${subject}`,
                                        "weight": "Bolder",
                                        "size": "Medium",
                                        "color": isHigh ? "Attention" : "Default"
                                    },
                                    {
                                        "type": "ColumnSet",
                                        "columns": [
                                            {
                                                "type": "Column",
                                                "width": "auto",
                                                "items": [
                                                    {
                                                        "type": "Image",
                                                        "url": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png", // Generic user icon
                                                        "size": "Small",
                                                        "style": "Person"
                                                    }
                                                ]
                                            },
                                            {
                                                "type": "Column",
                                                "width": "stretch",
                                                "items": [
                                                    {
                                                        "type": "TextBlock",
                                                        "text": user.name,
                                                        "weight": "Bolder",
                                                        "wrap": true
                                                    },
                                                    {
                                                        "type": "TextBlock",
                                                        "text": `Rol: ${user.role}`,
                                                        "spacing": "None",
                                                        "isSubtle": true,
                                                        "wrap": true,
                                                        "size": "Small"
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                "type": "Container",
                                "style": "emphasis",
                                "items": [
                                    {
                                        "type": "FactSet",
                                        "facts": facts
                                    },
                                    {
                                        "type": "TextBlock",
                                        "text": message,
                                        "wrap": true,
                                        "spacing": "Medium"
                                    }
                                ]
                            },
                            {
                                "type": "TextBlock",
                                "text": "Verzonden vanuit Factory Manager App",
                                "size": "Small",
                                "isSubtle": true,
                                "horizontalAlignment": "Center",
                                "spacing": "Large"
                            }
                        ],
                        "actions": [
                            {
                                "type": "Action.OpenUrl",
                                "title": "Open App Dashboard",
                                "url": window.location.origin
                            }
                        ]
                    }
                }
            ]
        };

        try {
            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(cardPayload)
            });

            if (response.ok) {
                return { success: true, message: "Bericht succesvol verzonden naar Teams." };
            } else {
                // Teams webhook usually returns string error message on fail
                const text = await response.text();
                console.error("Teams Webhook Error:", text);
                return { success: false, message: "Fout bij verzenden naar Teams. Controleer de URL." };
            }
        } catch (error) {
            console.error("Network Error:", error);
            return { success: false, message: "Netwerkfout. Check internetverbinding." };
        }
    }
};
