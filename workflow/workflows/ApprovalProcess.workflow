{
	"contents": {
		"345db8b7-6052-46e9-ba5a-4cfc653721e8": {
			"classDefinition": "com.sap.bpm.wfs.Model",
			"id": "com.deloitte.mdg.salespricing.worflow.approvalprocess",
			"subject": "ApprovalProcess",
			"name": "ApprovalProcess",
			"documentation": "",
			"lastIds": "62d7f4ed-4063-4c44-af8b-39050bd44926",
			"events": {
				"11a9b5ee-17c0-4159-9bbf-454dcfdcd5c3": {
					"name": "StartEvent1"
				},
				"2798f4e7-bc42-4fad-a248-159095a2f40a": {
					"name": "EndEvent1"
				}
			},
			"activities": {
				"2f5df686-798f-4ba5-a68d-a9bdae420632": {
					"name": "Approver"
				}
			},
			"sequenceFlows": {
				"c6b99f32-5fe6-4ab6-b60a-80fba1b9ae0f": {
					"name": "SequenceFlow1"
				},
				"92d12d9f-5ccc-48bd-ab79-213addec552d": {
					"name": "SequenceFlow2"
				}
			},
			"diagrams": {
				"42fa7a2d-c526-4a02-b3ba-49b5168ba644": {}
			}
		},
		"11a9b5ee-17c0-4159-9bbf-454dcfdcd5c3": {
			"classDefinition": "com.sap.bpm.wfs.StartEvent",
			"id": "startevent1",
			"name": "StartEvent1"
		},
		"2798f4e7-bc42-4fad-a248-159095a2f40a": {
			"classDefinition": "com.sap.bpm.wfs.EndEvent",
			"id": "endevent1",
			"name": "EndEvent1"
		},
		"2f5df686-798f-4ba5-a68d-a9bdae420632": {
			"classDefinition": "com.sap.bpm.wfs.UserTask",
			"subject": "${context.ReqId} - Sales Pricing Approval Required",
			"priority": "MEDIUM",
			"isHiddenInLogForParticipant": false,
			"supportsForward": false,
			"userInterface": "sapui5://5727b8ad-64a6-4e30-9bfa-c609376647ae.DG-SalesPricing.comdeloittemdgsalepricingapproverapprover/com.deloitte.mdg.salepricing.approver.approver",
			"recipientGroups": "SalesPricingApproval",
			"id": "usertask1",
			"name": "Approver"
		},
		"c6b99f32-5fe6-4ab6-b60a-80fba1b9ae0f": {
			"classDefinition": "com.sap.bpm.wfs.SequenceFlow",
			"id": "sequenceflow1",
			"name": "SequenceFlow1",
			"sourceRef": "11a9b5ee-17c0-4159-9bbf-454dcfdcd5c3",
			"targetRef": "2f5df686-798f-4ba5-a68d-a9bdae420632"
		},
		"42fa7a2d-c526-4a02-b3ba-49b5168ba644": {
			"classDefinition": "com.sap.bpm.wfs.ui.Diagram",
			"symbols": {
				"df898b52-91e1-4778-baad-2ad9a261d30e": {},
				"53e54950-7757-4161-82c9-afa7e86cff2c": {},
				"6bb141da-d485-4317-93b8-e17711df4c32": {},
				"95dc2c8a-cead-4963-a13e-6c30f7276854": {},
				"172abd74-78ea-4d1c-b889-fa9e3fd3fdbd": {}
			}
		},
		"df898b52-91e1-4778-baad-2ad9a261d30e": {
			"classDefinition": "com.sap.bpm.wfs.ui.StartEventSymbol",
			"x": 100,
			"y": 100,
			"width": 32,
			"height": 32,
			"object": "11a9b5ee-17c0-4159-9bbf-454dcfdcd5c3"
		},
		"53e54950-7757-4161-82c9-afa7e86cff2c": {
			"classDefinition": "com.sap.bpm.wfs.ui.EndEventSymbol",
			"x": 340,
			"y": 100,
			"width": 35,
			"height": 35,
			"object": "2798f4e7-bc42-4fad-a248-159095a2f40a"
		},
		"6bb141da-d485-4317-93b8-e17711df4c32": {
			"classDefinition": "com.sap.bpm.wfs.ui.SequenceFlowSymbol",
			"points": "116,116 231,116",
			"sourceSymbol": "df898b52-91e1-4778-baad-2ad9a261d30e",
			"targetSymbol": "95dc2c8a-cead-4963-a13e-6c30f7276854",
			"object": "c6b99f32-5fe6-4ab6-b60a-80fba1b9ae0f"
		},
		"95dc2c8a-cead-4963-a13e-6c30f7276854": {
			"classDefinition": "com.sap.bpm.wfs.ui.UserTaskSymbol",
			"x": 181,
			"y": 86,
			"width": 100,
			"height": 60,
			"object": "2f5df686-798f-4ba5-a68d-a9bdae420632"
		},
		"62d7f4ed-4063-4c44-af8b-39050bd44926": {
			"classDefinition": "com.sap.bpm.wfs.LastIDs",
			"sequenceflow": 2,
			"startevent": 1,
			"endevent": 1,
			"usertask": 1
		},
		"92d12d9f-5ccc-48bd-ab79-213addec552d": {
			"classDefinition": "com.sap.bpm.wfs.SequenceFlow",
			"id": "sequenceflow2",
			"name": "SequenceFlow2",
			"sourceRef": "2f5df686-798f-4ba5-a68d-a9bdae420632",
			"targetRef": "2798f4e7-bc42-4fad-a248-159095a2f40a"
		},
		"172abd74-78ea-4d1c-b889-fa9e3fd3fdbd": {
			"classDefinition": "com.sap.bpm.wfs.ui.SequenceFlowSymbol",
			"points": "231,116.75 357.5,116.75",
			"sourceSymbol": "95dc2c8a-cead-4963-a13e-6c30f7276854",
			"targetSymbol": "53e54950-7757-4161-82c9-afa7e86cff2c",
			"object": "92d12d9f-5ccc-48bd-ab79-213addec552d"
		}
	}
}