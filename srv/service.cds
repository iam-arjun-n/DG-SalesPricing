using com.deloitte.mdg.sales.pricing as db from '../db/data-model';

service SalePricingService {
  entity SalesPricingRequests as projection on db.SalesPricingRequests;
  entity SalesPricingComments as projection on db.SalesPricingComments;
}