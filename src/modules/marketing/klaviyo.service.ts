import { Klaviyo, Link } from "klaviyo-api";

export class KlaviyoService {
  private static client: any;

  static init(apiKey: string) {
    this.client = (require('klaviyo-api') as any).Klaviyo(apiKey);
  }

  /**
   * Track server-side events (Placed Order, Started Checkout)
   */
  static async trackEvent(email: string, eventName: string, properties: any) {
    if (!this.client) return;
    
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
    } catch (error) {
      console.error("Klaviyo Event Track Failed:", error);
    }
  }

  /**
   * Add/Update profile in Klaviyo
   */
  static async syncProfile(profileData: { email: string; firstName?: string; lastName?: string; phone?: string }) {
    if (!this.client) return;

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
    } catch (error) {
      console.error("Klaviyo Profile Sync Failed:", error);
    }
  }
}
