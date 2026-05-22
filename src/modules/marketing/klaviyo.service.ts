import { ConfigWrapper, EventsApi, ProfilesApi } from "klaviyo-api";

export class KlaviyoService {
  private static session: any = null;
  private static eventsApi: EventsApi | null = null;
  private static profilesApi: ProfilesApi | null = null;

  static init(apiKey?: string) {
    const key = apiKey || process.env.KLAVIYO_PRIVATE_API_KEY;
    if (key) {
      try {
        this.session = ConfigWrapper(key);
        this.eventsApi = new EventsApi(this.session);
        this.profilesApi = new ProfilesApi(this.session);
      } catch (err) {
        console.error("Klaviyo Initialization Failed:", err);
      }
    }
  }

  /**
   * Track server-side events (Placed Order, Started Checkout, etc.)
   */
  static async trackEvent(email: string, eventName: string, properties: any) {
    if (!this.eventsApi) return;
    
    try {
      await this.eventsApi.createEvent({
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
            properties: properties,
            time: new Date()
          }
        }
      });
    } catch (error: any) {
      console.error("Klaviyo Event Track Failed:", error.message || error);
    }
  }

  /**
   * Add/Update profile in Klaviyo
   */
  static async syncProfile(profileData: { email: string; firstName?: string; lastName?: string; phone?: string }) {
    if (!this.profilesApi) return;

    try {
      await this.profilesApi.createOrUpdateProfile({
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
    } catch (error: any) {
      console.error("Klaviyo Profile Sync Failed:", error.message || error);
    }
  }

  /**
   * Add member to a specific list
   */
  static async subscribeToList(email: string, listId?: string) {
    if (!this.profilesApi) return;

    // Use a default list if not provided, or fallback to a common "Newsletter" list
    const targetListId = listId || process.env.KLAVIYO_NEWSLETTER_LIST_ID;
    if (!targetListId || targetListId === "YOUR_LIST_ID_HERE") {
      console.warn("Valid Klaviyo Newsletter List ID not found in DB or .env");
      return;
    }

    try {
      await this.profilesApi.subscribeProfiles({
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: {
            customSource: "Newsletter Footer",
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
    } catch (error: any) {
      console.error("Klaviyo Subscription Failed:", error.message || error);
    }
  }
}
