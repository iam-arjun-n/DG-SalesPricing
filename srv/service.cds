using com.deloitte.mdg.sales.pricing as db from '../db/data-model';

service MaterialService {
  entity SalesRequestItems as projection on db.SalesRequestItems;
  entity ConditionRecords   as projection on db.ConditionRecords;
}