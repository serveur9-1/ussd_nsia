import {ResponseService} from "../types/appTypes";
import {Merchant} from "../types/models/merchant";
import {logger} from "../utils/logger";
import prisma from "../lib/prisma";

export default class MerchantRepository {
  static async getOneByPhoneNumber(phoneNumber: string): Promise<ResponseService<Merchant>> {
    try {
      const merchant = await prisma.merchant.findFirst({
        where: {
          status: 1,
          phoneNo: {
            contains: phoneNumber,
          },
          deleted_at: null,
        },
      });

      if (!merchant) {
        return {
          status: false,
        };
      }

      return {
        status: true,
        data: merchant as Merchant,
      };
    } catch (error) {
      logger.error("MerchantRepository.getMerchantClientInformations error:", error);
      return {
        status: false
      };
    }
  }

  static async updateCommission(
    commission: number,
    phoneNo: string
  ): Promise<ResponseService<boolean>> {
    try {
      const result = await prisma.$executeRaw`
          UPDATE merchant
          SET commission = ${commission}
          WHERE phoneNo = ${"225" + phoneNo}
             OR phoneNo = ${phoneNo}
      `;

      return {
        status: true,
        data: result > 0,
      };
    } catch (error) {
      logger.error("Erreur lors de la mise à jour de la commission merchant :", error);
      return {
        status: false,
        data: false,
      };
    }
  }
}
