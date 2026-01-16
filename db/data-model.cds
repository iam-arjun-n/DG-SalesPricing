namespace com.deloitte.mdg.sales.pricing;

using { cuid, managed } from '@sap/cds/common';

@assert.range
type RequestStatus  : String enum {
  Draft;
  Submitted;
  Cancelled;
  Error;
  Rejected;
  Approved;
}

@assert.range
type WorkflowStatus : String enum {
  NotStarted;
  InApproval;
  Completed;
  Rejected;
}

type RequestType    : String enum {
  Create;
  Change;
  Extend;
}

entity SalesPricingComments : managed {
  key ID          : UUID;
      request     : Association to SalesPricingRequests;
      user        : String(80);
      role        : String(20);
      commentText : String(500);
}

entity SalesPricingCondition : cuid {
  key ID               : UUID;
      conditionType    : String(4);
      keyCombinationId : String(50);
      fields           : LargeString; 
      columns          : LargeString;  
      request          : Association to SalesPricingRequests;
}

entity SalesPricingRequests : managed {
  key requestId      : String(11);
      requestType    : RequestType;
      workflowStatus : WorkflowStatus;
      requestStatus  : RequestStatus;
      createdByName  : String(80);
      comments       : Composition of many SalesPricingComments
                         on comments.request = $self;
}