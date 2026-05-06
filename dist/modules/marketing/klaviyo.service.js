"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KlaviyoService = void 0;
class KlaviyoService {
    static client;
    static init(apiKey) {
        const key = apiKey || process.env.KLAVIYO_PRIVATE_API_KEY;
        if (key) {
            this.client = require('klaviyo-api').Klaviyo(key);
        }
    }
    /**
     * Track server-side events (Placed Order, Started Checkout)
     */
    static async trackEvent(email, eventName, properties) {
        if (!this.client)
            return;
        try {
            await this.client.Events.createEvent({
                data: {
                    type: "event",
                    attributes: {
                        metric: {
                            data: {
                                type: "metric",
                                attributes: { name: eventName }
                            }
                        },
                        profile: {
                            data: {
                                type: "profile",
                                attributes: { email }
                            }
                        },
                        properties: properties
                    }
                }
            });
        }
        catch (error) {
            console.error("Klaviyo Event Track Failed:", error);
        }
    }
    /**
     * Add/Update profile in Klaviyo
     */
    static async syncProfile(profileData) {
        if (!this.client)
            return;
        try {
            await this.client.Profiles.createOrUpdateProfile({
                data: {
                    type: "profile",
                    attributes: {
                        email: profileData.email,
                        firstName: profileData.firstName,
                        lastName: profileData.lastName,
                        phoneNumber: profileData.phone
                    }
                }
            });
        }
        catch (error) {
            console.error("Klaviyo Profile Sync Failed:", error);
        }
    }
    /**
     * Add member to a specific list
     */
    static async subscribeToList(email, listId) {
        if (!this.client)
            return;
        // Use a default list if not provided, or fallback to a common "Newsletter" list
        const targetListId = listId || process.env.KLAVIYO_NEWSLETTER_LIST_ID;
        if (!targetListId) {
            console.warn("KLAVIYO_NEWSLETTER_LIST_ID not found in .env");
            return;
        }
        try {
            await this.client.Profiles.subscribeProfiles({
                data: {
                    type: "profile-subscription-bulk-create-job",
                    attributes: {
                        custom_source: "Newsletter Footer",
                        profiles: {
                            data: [
                                {
                                    type: "profile",
                                    attributes: {
                                        email,
                                        subscriptions: {
                                            email: {
                                                marketing: {
                                                    consent: "SUBSCRIBED"
                                                }
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    relationships: {
                        list: {
                            data: {
                                type: "list",
                                id: targetListId
                            }
                        }
                    }
                }
            });
        }
        catch (error) {
            console.error("Klaviyo Subscription Failed:", error);
        }
    }
}
exports.KlaviyoService = KlaviyoService;
