"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KlaviyoService = void 0;
class KlaviyoService {
    static client;
    static init(apiKey) {
        this.client = require('klaviyo-api').Klaviyo(apiKey);
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
}
exports.KlaviyoService = KlaviyoService;
