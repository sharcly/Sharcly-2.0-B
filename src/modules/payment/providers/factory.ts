import { StripeProvider } from "./stripe.provider";
import { SquareProvider } from "./square.provider";
import { PaypalProvider } from "./paypal.provider";
import { RazorpayProvider } from "./razorpay.provider";
import { BraintreeProvider } from "./braintree.provider";
import { AuthorizeNetProvider } from "./authorizenet.provider";
import { PaymentProviderInterface } from "./provider.interface";

export class PaymentProviderFactory {
  static getProvider(gatewayName: string): PaymentProviderInterface {
    switch (gatewayName.toLowerCase().replace(/[^a-z0-9]/g, "")) {
      case "stripe":
        return new StripeProvider();
      case "square":
        return new SquareProvider();
      case "paypal":
        return new PaypalProvider();
      case "razorpay":
        return new RazorpayProvider();
      case "braintree":
        return new BraintreeProvider();
      case "authorizenet":
        return new AuthorizeNetProvider();
      default:
        throw new Error(`Unsupported payment gateway provider: ${gatewayName}`);
    }
  }
}
