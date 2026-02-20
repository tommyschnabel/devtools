export interface Hl7Separators {
  field: string;
  component: string;
  repetition: string;
  escape: string;
  subcomponent: string;
}

export interface Hl7Subcomponent {
  position: number;
  raw: string;
  value: string;
}

export interface Hl7Component {
  position: number;
  raw: string;
  value: string;
  subcomponents: Hl7Subcomponent[];
}

export interface Hl7Repetition {
  position: number;
  raw: string;
  value: string;
  components: Hl7Component[];
}

export interface Hl7Field {
  position: number;
  raw: string;
  value: string;
  repetitions: Hl7Repetition[];
}

export interface Hl7Segment {
  index: number;
  name: string;
  raw: string;
  fields: Hl7Field[];
}

export interface ParsedHl7Message {
  separators: Hl7Separators;
  messageType?: string;
  triggerEvent?: string;
  messageStructure?: string;
  version?: string;
  controlId?: string;
  sendingApplication?: string;
  sendingFacility?: string;
  receivingApplication?: string;
  receivingFacility?: string;
  timestamp?: string;
  segments: Hl7Segment[];
  segmentCounts: Record<string, number>;
}

export interface Hl7ParseResult {
  success: boolean;
  data?: ParsedHl7Message;
  error?: string;
  warnings?: string[];
}

const SEGMENT_LABELS: Record<string, string> = {
  MSH: 'Message Header',
  EVN: 'Event Type',
  PID: 'Patient Identification',
  PD1: 'Patient Additional Demographics',
  PV1: 'Patient Visit',
  PV2: 'Patient Visit - Additional',
  NK1: 'Next of Kin',
  ORC: 'Common Order',
  RXA: 'Pharmacy/Treatment Administration',
  SCH: 'Schedule Activity Information',
  RGS: 'Resource Group',
  AIS: 'Appointment Information - Service',
  AIG: 'Appointment Information - General Resource',
  AIL: 'Appointment Information - Location Resource',
  AIP: 'Appointment Information - Personnel Resource',
  OBR: 'Observation Request',
  OBX: 'Observation Result',
  NTE: 'Notes and Comments',
  AL1: 'Patient Allergy Information',
  DG1: 'Diagnosis',
  IN1: 'Insurance',
  GT1: 'Guarantor',
};

const FIELD_LABELS: Record<string, Record<number, string>> = {
  MSH: {
    1: 'Field Separator',
    2: 'Encoding Characters',
    3: 'Sending Application',
    4: 'Sending Facility',
    5: 'Receiving Application',
    6: 'Receiving Facility',
    7: 'Date/Time of Message',
    8: 'Security',
    9: 'Message Type',
    10: 'Message Control ID',
    11: 'Processing ID',
    12: 'Version ID',
    13: 'Sequence Number',
    14: 'Continuation Pointer',
    15: 'Accept Acknowledgment Type',
    16: 'Application Acknowledgment Type',
    17: 'Country Code',
    18: 'Character Set',
    19: 'Principal Language of Message',
    20: 'Alternate Character Set Handling Scheme',
    21: 'Message Profile Identifier',
  },
  EVN: {
    1: 'Event Type Code',
    2: 'Recorded Date/Time',
    3: 'Date/Time Planned Event',
    4: 'Event Reason Code',
    5: 'Operator ID',
    6: 'Event Occurred',
    7: 'Event Facility',
  },
  PID: {
    1: 'Set ID - PID',
    2: 'Patient ID',
    3: 'Patient Identifier List',
    4: 'Alternate Patient ID - PID',
    5: 'Patient Name',
    6: "Mother's Maiden Name",
    7: 'Date/Time of Birth',
    8: 'Administrative Sex',
    9: 'Patient Alias',
    10: 'Race',
    11: 'Patient Address',
    12: 'County Code',
    13: 'Phone Number - Home',
    14: 'Phone Number - Business',
    15: 'Primary Language',
    16: 'Marital Status',
    17: 'Religion',
    18: 'Patient Account Number',
    19: 'SSN Number - Patient',
    20: "Driver's License Number - Patient",
    21: "Mother's Identifier",
    22: 'Ethnic Group',
    23: 'Birth Place',
    24: 'Multiple Birth Indicator',
    25: 'Birth Order',
    26: 'Citizenship',
    27: 'Veterans Military Status',
    28: 'Nationality',
    29: 'Patient Death Date and Time',
    30: 'Patient Death Indicator',
  },
  PV1: {
    1: 'Set ID - PV1',
    2: 'Patient Class',
    3: 'Assigned Patient Location',
    4: 'Admission Type',
    5: 'Preadmit Number',
    6: 'Prior Patient Location',
    7: 'Attending Doctor',
    8: 'Referring Doctor',
    9: 'Consulting Doctor',
    10: 'Hospital Service',
    11: 'Temporary Location',
    12: 'Preadmit Test Indicator',
    13: 'Re-admission Indicator',
    14: 'Admit Source',
    15: 'Ambulatory Status',
    16: 'VIP Indicator',
    17: 'Admitting Doctor',
    18: 'Patient Type',
    19: 'Visit Number',
    20: 'Financial Class',
    21: 'Charge Price Indicator',
    22: 'Courtesy Code',
    23: 'Credit Rating',
    24: 'Contract Code',
    25: 'Contract Effective Date',
    26: 'Contract Amount',
    27: 'Contract Period',
    28: 'Interest Code',
    29: 'Transfer to Bad Debt Code',
    30: 'Transfer to Bad Debt Date',
    31: 'Bad Debt Agency Code',
    32: 'Bad Debt Transfer Amount',
    33: 'Bad Debt Recovery Amount',
    34: 'Delete Account Indicator',
    35: 'Delete Account Date',
    36: 'Discharge Disposition',
    37: 'Discharged to Location',
    38: 'Diet Type',
    39: 'Servicing Facility',
    40: 'Bed Status',
    41: 'Account Status',
    42: 'Pending Location',
    43: 'Prior Temporary Location',
    44: 'Admit Date/Time',
    45: 'Discharge Date/Time',
  },
  NK1: {
    1: 'Set ID - NK1',
    2: 'Name',
    3: 'Relationship',
    4: 'Address',
    5: 'Phone Number',
    6: 'Business Phone Number',
    7: 'Contact Role',
    8: 'Start Date',
    9: 'End Date',
    10: 'Next of Kin/Associated Parties Job Title',
    11: 'Job Status',
    12: 'Party Identifier',
    13: 'Organization Name - NK1',
    14: 'Marital Status',
    15: 'Administrative Sex',
    16: 'Date/Time of Birth',
    17: 'Living Dependency',
    18: 'Ambulatory Status',
    19: 'Citizenship',
    20: 'Primary Language',
  },
  ORC: {
    1: 'Order Control',
    2: 'Placer Order Number',
    3: 'Filler Order Number',
    4: 'Placer Group Number',
    5: 'Order Status',
    6: 'Response Flag',
    7: 'Quantity/Timing',
    8: 'Parent',
    9: 'Date/Time of Transaction',
    10: 'Entered By',
    11: 'Verified By',
    12: 'Ordering Provider',
    13: "Enterer's Location",
    14: 'Call Back Phone Number',
    15: 'Order Effective Date/Time',
    16: 'Order Control Code Reason',
    17: 'Entering Organization',
    18: 'Entering Device',
    19: 'Action By',
  },
  RXA: {
    1: 'Give Sub-ID Counter',
    2: 'Administration Sub-ID Counter',
    3: 'Date/Time Start of Administration',
    4: 'Date/Time End of Administration',
    5: 'Administered Code',
    6: 'Administered Amount',
    7: 'Administered Units',
    8: 'Administered Dosage Form',
    9: 'Administration Notes',
    10: 'Administering Provider',
    11: 'Administered-at Location',
    12: 'Administered Per (Time Unit)',
    13: 'Administered Strength',
    14: 'Administered Strength Units',
    15: 'Substance Lot Number',
    16: 'Substance Expiration Date',
    17: 'Substance Manufacturer Name',
    18: 'Substance/Treatment Refusal Reason',
    19: 'Indication',
    20: 'Completion Status',
    21: 'Action Code - RXA',
    22: 'System Entry Date/Time',
  },
  SCH: {
    1: 'Placer Appointment ID',
    2: 'Filler Appointment ID',
    3: 'Occurrence Number',
    4: 'Placer Group Number',
    5: 'Schedule ID',
    6: 'Event Reason',
    7: 'Appointment Reason',
    8: 'Appointment Type',
    9: 'Appointment Duration',
    10: 'Appointment Duration Units',
    11: 'Appointment Timing Quantity',
    12: 'Placer Contact Person',
    13: 'Placer Contact Phone Number',
    14: 'Placer Contact Address',
    15: 'Placer Contact Location',
    16: 'Filler Contact Person',
    17: 'Filler Contact Phone Number',
    18: 'Filler Contact Address',
    19: 'Filler Contact Location',
    20: 'Entered By Person',
    21: 'Entered By Phone Number',
    22: 'Entered By Location',
    23: 'Parent Placer Appointment ID',
    24: 'Parent Filler Appointment ID',
    25: 'Filler Status Code',
  },
  RGS: {
    1: 'Set ID - RGS',
    2: 'Segment Action Code',
    3: 'Resource Group ID',
  },
  AIS: {
    1: 'Set ID - AIS',
    2: 'Segment Action Code',
    3: 'Universal Service Identifier',
    4: 'Start Date/Time',
    5: 'Start Date/Time Offset',
    6: 'Start Date/Time Offset Units',
    7: 'Duration',
    8: 'Duration Units',
    9: 'Allow Substitution Code',
    10: 'Filler Status Code',
  },
  AIG: {
    1: 'Set ID - AIG',
    2: 'Segment Action Code',
    3: 'Resource ID',
    4: 'Resource Type',
    5: 'Resource Group',
    6: 'Start Date/Time',
    7: 'Start Date/Time Offset',
    8: 'Start Date/Time Offset Units',
    9: 'Duration',
    10: 'Duration Units',
    11: 'Allow Substitution Code',
    12: 'Filler Status Code',
  },
  AIL: {
    1: 'Set ID - AIL',
    2: 'Segment Action Code',
    3: 'Location Resource ID',
    4: 'Location Type - AIL',
    5: 'Location Group',
    6: 'Start Date/Time',
    7: 'Start Date/Time Offset',
    8: 'Start Date/Time Offset Units',
    9: 'Duration',
    10: 'Duration Units',
    11: 'Allow Substitution Code',
    12: 'Filler Status Code',
  },
  AIP: {
    1: 'Set ID - AIP',
    2: 'Segment Action Code',
    3: 'Personnel Resource ID',
    4: 'Resource Type',
    5: 'Resource Group',
    6: 'Start Date/Time',
    7: 'Start Date/Time Offset',
    8: 'Start Date/Time Offset Units',
    9: 'Duration',
    10: 'Duration Units',
    11: 'Allow Substitution Code',
    12: 'Filler Status Code',
  },
  OBR: {
    1: 'Set ID - OBR',
    2: 'Placer Order Number',
    3: 'Filler Order Number',
    4: 'Universal Service Identifier',
    5: 'Priority',
    6: 'Requested Date/Time',
    7: 'Observation Date/Time',
    8: 'Observation End Date/Time',
    9: 'Collection Volume',
    10: 'Collector Identifier',
    11: 'Specimen Action Code',
    12: 'Danger Code',
    13: 'Relevant Clinical Information',
    14: 'Specimen Received Date/Time',
    15: 'Specimen Source',
    16: 'Ordering Provider',
    17: 'Order Callback Phone Number',
    18: 'Placer Field 1',
    19: 'Placer Field 2',
    20: 'Filler Field 1',
    21: 'Filler Field 2',
    22: 'Results Rpt/Status Chng - Date/Time',
    23: 'Charge to Practice',
    24: 'Diagnostic Serv Sect ID',
    25: 'Result Status',
    26: 'Parent Result',
    27: 'Quantity/Timing',
    28: 'Result Copies To',
    29: 'Parent',
    30: 'Transportation Mode',
    31: 'Reason for Study',
    32: 'Principal Result Interpreter',
    33: 'Assistant Result Interpreter',
    34: 'Technician',
    35: 'Transcriptionist',
    36: 'Scheduled Date/Time',
  },
  OBX: {
    1: 'Set ID - OBX',
    2: 'Value Type',
    3: 'Observation Identifier',
    4: 'Observation Sub-ID',
    5: 'Observation Value',
    6: 'Units',
    7: 'References Range',
    8: 'Abnormal Flags',
    9: 'Probability',
    10: 'Nature of Abnormal Test',
    11: 'Observation Result Status',
    12: 'Effective Date of Reference Range',
    13: 'User Defined Access Checks',
    14: 'Date/Time of the Observation',
    15: "Producer's ID",
    16: 'Responsible Observer',
    17: 'Observation Method',
    18: 'Equipment Instance Identifier',
    19: 'Date/Time of the Analysis',
  },
  NTE: {
    1: 'Set ID - NTE',
    2: 'Source of Comment',
    3: 'Comment',
    4: 'Comment Type',
  },
};

const COMPONENT_LABELS: Record<string, Record<number, string[]>> = {
  MSH: {
    9: ['Message Code', 'Trigger Event', 'Message Structure'],
  },
  EVN: {
    5: ['ID Number', 'Family Name', 'Given Name', 'Middle Name', 'Suffix', 'Prefix'],
  },
  PID: {
    3: ['ID Number', 'Check Digit', 'Check Digit Scheme', 'Assigning Authority', 'Identifier Type Code'],
    5: ['Family Name', 'Given Name', 'Middle Name', 'Suffix', 'Prefix', 'Degree'],
    11: ['Street Address', 'Other Designation', 'City', 'State', 'Zip/Postal Code', 'Country'],
    13: ['Telephone Number', 'Telecommunication Use Code', 'Telecommunication Equipment Type'],
  },
  NK1: {
    2: ['Family Name', 'Given Name', 'Middle Name', 'Suffix', 'Prefix'],
    4: ['Street Address', 'Other Designation', 'City', 'State', 'Zip/Postal Code', 'Country'],
    5: ['Telephone Number', 'Telecommunication Use Code', 'Telecommunication Equipment Type'],
  },
  PV1: {
    3: ['Point of Care', 'Room', 'Bed', 'Facility', 'Location Status', 'Person Location Type'],
    7: ['ID Number', 'Family Name', 'Given Name', 'Middle Name', 'Suffix', 'Prefix'],
    19: ['ID Number', 'Check Digit', 'Check Digit Scheme', 'Assigning Authority'],
  },
  ORC: {
    2: ['Entity Identifier', 'Namespace ID', 'Universal ID', 'Universal ID Type'],
    3: ['Entity Identifier', 'Namespace ID', 'Universal ID', 'Universal ID Type'],
    12: ['ID Number', 'Family Name', 'Given Name', 'Middle Name', 'Suffix', 'Prefix'],
  },
  RXA: {
    5: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
    7: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
    10: ['ID Number', 'Family Name', 'Given Name', 'Middle Name', 'Suffix', 'Prefix'],
    17: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
  },
  SCH: {
    1: ['Entity Identifier', 'Namespace ID', 'Universal ID', 'Universal ID Type'],
    2: ['Entity Identifier', 'Namespace ID', 'Universal ID', 'Universal ID Type'],
    5: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
    6: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
    7: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
    10: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
    16: ['ID Number', 'Family Name', 'Given Name', 'Middle Name', 'Suffix', 'Prefix'],
  },
  AIS: {
    3: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
    8: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
  },
  AIG: {
    3: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
    4: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
  },
  AIL: {
    3: ['Point of Care', 'Room', 'Bed', 'Facility', 'Location Status', 'Person Location Type'],
  },
  AIP: {
    3: ['ID Number', 'Family Name', 'Given Name', 'Middle Name', 'Suffix', 'Prefix'],
    4: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
  },
  OBR: {
    4: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
    16: ['ID Number', 'Family Name', 'Given Name', 'Middle Name', 'Suffix', 'Prefix'],
  },
  OBX: {
    3: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
    5: ['Observation Value'],
    6: ['Identifier', 'Text', 'Name of Coding System', 'Alternate Identifier', 'Alternate Text'],
  },
};

const DEFAULT_SEPARATORS: Hl7Separators = {
  field: '|',
  component: '^',
  repetition: '~',
  escape: '\\',
  subcomponent: '&',
};

export function getSegmentLabel(segmentName: string): string {
  return SEGMENT_LABELS[segmentName] || 'Segment';
}

export function getFieldLabel(segmentName: string, position: number): string {
  return FIELD_LABELS[segmentName]?.[position] || `Field ${position}`;
}

export function getComponentLabel(
  segmentName: string,
  fieldPosition: number,
  componentPosition: number
): string {
  return COMPONENT_LABELS[segmentName]?.[fieldPosition]?.[componentPosition - 1] || `Component ${componentPosition}`;
}

function decodeEscapes(value: string, separators: Hl7Separators): string {
  const esc = separators.escape;
  if (!esc || !value.includes(esc)) {
    return value;
  }

  return value
    .split(`${esc}F${esc}`)
    .join(separators.field)
    .split(`${esc}S${esc}`)
    .join(separators.component)
    .split(`${esc}R${esc}`)
    .join(separators.repetition)
    .split(`${esc}T${esc}`)
    .join(separators.subcomponent)
    .split(`${esc}E${esc}`)
    .join(separators.escape);
}

function parseField(field: string, position: number, separators: Hl7Separators): Hl7Field {
  if (field.length === 0) {
    return {
      position,
      raw: '',
      value: '',
      repetitions: [],
    };
  }

  const repetitions = field.split(separators.repetition).map((repetition, repetitionIndex) => {
    const components = repetition.split(separators.component).map((component, componentIndex) => {
      const subcomponents = component.split(separators.subcomponent).map((subcomponent, subcomponentIndex) => ({
        position: subcomponentIndex + 1,
        raw: subcomponent,
        value: decodeEscapes(subcomponent, separators),
      }));

      return {
        position: componentIndex + 1,
        raw: component,
        value: subcomponents.map((sub) => sub.value).join(separators.subcomponent),
        subcomponents,
      };
    });

    return {
      position: repetitionIndex + 1,
      raw: repetition,
      value: components.map((component) => component.value).join(separators.component),
      components,
    };
  });

  return {
    position,
    raw: field,
    value: repetitions.map((repetition) => repetition.value).join(separators.repetition),
    repetitions,
  };
}

function normalizeLines(input: string): string[] {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseMshType(messageTypeValue: string, componentSeparator: string): {
  messageType?: string;
  triggerEvent?: string;
  messageStructure?: string;
} {
  if (!messageTypeValue) {
    return {};
  }

  const parts = messageTypeValue.split(componentSeparator);
  return {
    messageType: parts[0] || undefined,
    triggerEvent: parts[1] || undefined,
    messageStructure: parts[2] || undefined,
  };
}

export function parseHl7Message(input: string): Hl7ParseResult {
  if (!input.trim()) {
    return {
      success: false,
      error: 'Input is empty',
    };
  }

  const warnings: string[] = [];
  const lines = normalizeLines(input);
  if (lines.length === 0) {
    return {
      success: false,
      error: 'Input is empty',
    };
  }

  const firstSegment = lines[0];
  if (!firstSegment || !firstSegment.startsWith('MSH')) {
    return {
      success: false,
      error: 'HL7 message must start with an MSH segment.',
    };
  }

  const fieldSeparator = firstSegment.charAt(3);
  if (!fieldSeparator) {
    return {
      success: false,
      error: 'MSH segment is missing the field separator (MSH-1).',
    };
  }

  const mshParts = firstSegment.split(fieldSeparator);
  const encodingCharacters = mshParts[1] || '';
  const separators: Hl7Separators = {
    field: fieldSeparator,
    component: encodingCharacters.charAt(0) || DEFAULT_SEPARATORS.component,
    repetition: encodingCharacters.charAt(1) || DEFAULT_SEPARATORS.repetition,
    escape: encodingCharacters.charAt(2) || DEFAULT_SEPARATORS.escape,
    subcomponent: encodingCharacters.charAt(3) || DEFAULT_SEPARATORS.subcomponent,
  };

  if (encodingCharacters.length < 4) {
    warnings.push(
      'MSH-2 encoding characters were incomplete. Missing values were filled with HL7 defaults (^~\\&).'
    );
  }

  const segmentCounts: Record<string, number> = {};
  const segments: Hl7Segment[] = [];

  lines.forEach((rawSegment, segmentIndex) => {
    const segmentName = rawSegment.slice(0, 3).toUpperCase();
    if (segmentName.length !== 3) {
      warnings.push(`Segment ${segmentIndex + 1} has an invalid segment name.`);
      return;
    }

    if (rawSegment.length > 3 && rawSegment.charAt(3) !== fieldSeparator) {
      warnings.push(
        `Segment ${segmentName} at line ${segmentIndex + 1} uses a different field separator.`
      );
    }

    const split = rawSegment.split(fieldSeparator);
    const rawFields = split.slice(1);
    const normalizedFields =
      segmentName === 'MSH' ? [fieldSeparator, ...rawFields] : rawFields;

    const fields = normalizedFields.map((fieldValue, fieldIndex) =>
      parseField(fieldValue, fieldIndex + 1, separators)
    );

    segmentCounts[segmentName] = (segmentCounts[segmentName] || 0) + 1;
    segments.push({
      index: segmentIndex + 1,
      name: segmentName,
      raw: rawSegment,
      fields,
    });
  });

  const msh = segments.find((segment) => segment.name === 'MSH');
  const getMshField = (position: number): string =>
    msh?.fields.find((field) => field.position === position)?.value || '';
  const messageTypeParts = parseMshType(getMshField(9), separators.component);

  return {
    success: true,
    data: {
      separators,
      ...messageTypeParts,
      version: getMshField(12) || undefined,
      controlId: getMshField(10) || undefined,
      sendingApplication: getMshField(3) || undefined,
      sendingFacility: getMshField(4) || undefined,
      receivingApplication: getMshField(5) || undefined,
      receivingFacility: getMshField(6) || undefined,
      timestamp: getMshField(7) || undefined,
      segments,
      segmentCounts,
    },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export interface Hl7SampleMessage {
  id: string;
  label: string;
  description: string;
  message: string;
}

export const HL7_SAMPLES: Hl7SampleMessage[] = [
  {
    id: 'oru-r01-lab',
    label: 'ORU^R01 - Lab Result',
    description: 'Observation result with OBR/OBX segments',
    message: `MSH|^~\\&|LABAPP|HOSPITAL_A|EHR|HOSPITAL_A|20260220101530||ORU^R01|MSG00001|P|2.5
PID|1||123456^^^HOSPITAL_A^MR||DOE^JANE^A||19850412|F|||123 MAIN ST^^DENVER^CO^80202||555-0100
PV1|1|I|ICU^101^1^HOSPITAL_A||||12345^SMITH^JOHN^M|||MED||||1|A0|
OBR|1|ORD448811|ACC998877|88304^PATHOLOGY EXAM^L|||20260220094500||||||||12345^SMITH^JOHN^M
OBX|1|NM|WBC^WHITE BLOOD CELLS^L||7.4|10*3/uL|4.0-11.0|N|||F
OBX|2|NM|HGB^HEMOGLOBIN^L||13.8|g/dL|12.0-16.0|N|||F
NTE|1|L|Patient reported mild headache \\F\\ nausea prior to sample collection.`,
  },
  {
    id: 'adt-a01-admit',
    label: 'ADT^A01 - Patient Admit',
    description: 'Admission event with demographics, next of kin, and visit details',
    message: `MSH|^~\\&|ADTAPP|GENERAL_HOSP|EHR|GENERAL_HOSP|20260220083000||ADT^A01^ADT_A01|MSG00002|P|2.5
EVN|A01|20260220082945
PID|1||998877^^^GENERAL_HOSP^MR||DOE^JOHN^MICHAEL||19790321|M|||456 OAK AVE^^AUSTIN^TX^78701||555-2121|||S||PAT778899|999-88-7777
NK1|1|DOE^JANE|SPO|456 OAK AVE^^AUSTIN^TX^78701|555-2122
PV1|1|I|MEDSURG^212^B^GENERAL_HOSP||ER||||24680^ADAMS^KELLY^R|||MED||||1|A0|VN123456`,
  },
  {
    id: 'orm-o01-order',
    label: 'ORM^O01 - New Order',
    description: 'Order message with ORC/OBR request details',
    message: `MSH|^~\\&|CPOE|GENERAL_HOSP|LIS|GENERAL_HOSP|20260220113010||ORM^O01^ORM_O01|MSG00003|P|2.5
PID|1||445566^^^GENERAL_HOSP^MR||LOPEZ^MARIA||19911205|F|||789 PINE RD^^PHOENIX^AZ^85004||555-3434
PV1|1|O|OPD^12^1^GENERAL_HOSP||||13579^PATEL^ANITA^K
ORC|NW|PO123456|FO654321||CM||||20260220112900|||13579^PATEL^ANITA^K
OBR|1|PO123456|FO654321|80053^COMPREHENSIVE METABOLIC PANEL^L|||20260220120000|||||||13579^PATEL^ANITA^K`,
  },
  {
    id: 'vxu-v04-immunization',
    label: 'VXU^V04 - Immunization Update',
    description: 'Vaccination update with coded immunization observation',
    message: `MSH|^~\\&|IMM_REGISTRY|COUNTY_HEALTH|STATE_IIS|STATE|20260220140545||VXU^V04^VXU_V04|MSG00004|P|2.5.1
PID|1||332211^^^COUNTY_HEALTH^MR||NGUYEN^LUCY||20150514|F|||123 ELM ST^^SEATTLE^WA^98101||555-6767
ORC|RE|IMM0001|IMM0001
RXA|0|1|20260220||141^Influenza, seasonal, injectable^CVX|0.5|mL^^UCUM|||||AA1234|20270831|MSD^Merck^MVX
OBX|1|CE|59784-9^Disease with presumed immunity^LN||38907003^Influenza caused by Influenza virus^SCT`,
  },
  {
    id: 'siu-s12-new-appointment',
    label: 'SIU^S12 - New Appointment',
    description: 'Scheduling message for a newly booked appointment',
    message: `MSH|^~\\&|SCHEDSYS|CLINIC_A|EHR|CLINIC_A|20260221100000||SIU^S12^SIU_S12|MSG00005|P|2.5
SCH|A10001^CLINIC_A|F10001^CLINIC_A|||FOLLOWUP^Follow-up Visit^HL70276|ROUTINE^Routine^HL70277|30|min^Minute|^^^20260225103000^20260225110000|||||12345^BROWN^EMMA^J
PID|1||556677^^^CLINIC_A^MR||WALKER^ETHAN||19880214|M|||12 RIVER ST^^PORTLAND^OR^97205||555-7878
PV1|1|O|CLINIC1^201^1^CLINIC_A||||12345^BROWN^EMMA^J
RGS|1||A10001
AIS|1||99213^Office/outpatient visit established^CPT|20260225103000|||30|min
AIP|1||12345^BROWN^EMMA^J^MD|Primary Provider|20260225103000|||30|min
AIL|1||CLINIC1^201^1^CLINIC_A|Exam Room 201|20260225103000|||30|min
NTE|1|L|Patient requested morning appointment.`,
  },
  {
    id: 'siu-s13-reschedule',
    label: 'SIU^S13 - Rescheduled Appointment',
    description: 'Scheduling update where appointment time was changed',
    message: `MSH|^~\\&|SCHEDSYS|CLINIC_A|EHR|CLINIC_A|20260221153000||SIU^S13^SIU_S13|MSG00006|P|2.5
SCH|A10001^CLINIC_A|F10001^CLINIC_A|||FOLLOWUP^Follow-up Visit^HL70276|ROUTINE^Routine^HL70277|30|min^Minute|^^^20260226150000^20260226153000|||||12345^BROWN^EMMA^J
PID|1||556677^^^CLINIC_A^MR||WALKER^ETHAN||19880214|M|||12 RIVER ST^^PORTLAND^OR^97205||555-7878
PV1|1|O|CLINIC1^203^1^CLINIC_A||||12345^BROWN^EMMA^J
RGS|1||A10001
AIS|1||99213^Office/outpatient visit established^CPT|20260226150000|||30|min
AIP|1||12345^BROWN^EMMA^J^MD|Primary Provider|20260226150000|||30|min
AIL|1||CLINIC1^203^1^CLINIC_A|Exam Room 203|20260226150000|||30|min
NTE|1|L|Rescheduled due to provider availability.`,
  },
  {
    id: 'siu-s15-cancel',
    label: 'SIU^S15 - Appointment Cancellation',
    description: 'Cancellation notice for a previously scheduled appointment',
    message: `MSH|^~\\&|SCHEDSYS|CLINIC_A|EHR|CLINIC_A|20260222091500||SIU^S15^SIU_S15|MSG00007|P|2.5
SCH|A10002^CLINIC_A|F10002^CLINIC_A|||CONSULT^Consultation^HL70276|ROUTINE^Routine^HL70277|45|min^Minute|^^^20260227110000^20260227114500|||||67890^LEE^MIA^R
PID|1||778899^^^CLINIC_A^MR||HERNANDEZ^SOFIA||19941130|F|||89 CEDAR LN^^DENVER^CO^80209||555-9191
PV1|1|O|CLINIC2^105^1^CLINIC_A||||67890^LEE^MIA^R
RGS|1||A10002
AIS|1||99244^Office consultation^CPT|20260227110000|||45|min
AIP|1||67890^LEE^MIA^R^MD|Consulting Provider|20260227110000|||45|min
AIL|1||CLINIC2^105^1^CLINIC_A|Consult Room 105|20260227110000|||45|min
NTE|1|L|Appointment cancelled by patient.`,
  },
];

export const SAMPLE_HL7_MESSAGE = HL7_SAMPLES[0]?.message || '';
