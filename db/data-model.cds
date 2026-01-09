namespace com.deloitte.mdg.sales.pricing;

using {
  cuid
} from '@sap/cds/common';

@assert.range
type WorkflowStatus : String enum {
  ![Not Started];
  ![In Approval];
  Rejected;
  ![Not Applicable];
  Completed;
}

type Type           : String enum {
  Create;
  Change;
  Extend;
}

entity SalesRequestItems: cuid {
  key ID             : UUID;
      RequestId      : String;
      WorkflowStatus : String;
      Type           : String;
      CreatedBy      : String;
      CreatedOn      : Date;
}

entity ConditionRecords{
  key ConditionRecord : String;
      ConditionTable  : String;
      ConditionType   : String;
      Material        : String;
}