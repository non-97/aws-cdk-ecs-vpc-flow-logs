import * as cdk from "aws-cdk-lib";

export interface PatchBehavior {
  patchBehavior?: "scan" | "install";
}

export interface LifecycleRule {
  prefix?: string;
  expirationDays: number;
  ruleNameSuffix?: string;
  abortIncompleteMultipartUploadAfter?: cdk.Duration;
}

export interface NetworkProperty {
  vpcCidr: string;
  subnetConfigurations: cdk.aws_ec2.SubnetConfiguration[];
  maxAzs: number;
  natGateways: number;
  vpcFlowLogs: {
    trafficType?: cdk.aws_ec2.FlowLogTrafficType;
    options?: cdk.aws_ec2.S3DestinationOptions;
    lifecycleRules?: LifecycleRule[];
  };
}

export interface EcsProps {
  network: NetworkProperty;
}

export interface EcsStackParams {
  env?: cdk.Environment;
  props: EcsProps;
}

export const ecsStackParams: EcsStackParams = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  props: {
    network: {
      vpcCidr: "10.10.0.0/20",
      subnetConfigurations: [
        {
          name: "public",
          subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
          cidrMask: 27,
        },
      ],
      maxAzs: 2,
      natGateways: 0,
      vpcFlowLogs: {
        trafficType: cdk.aws_ec2.FlowLogTrafficType.ALL,
        options: {
          fileFormat: cdk.aws_ec2.FlowLogFileFormat.PLAIN_TEXT,
          hiveCompatiblePartitions: false,
          perHourPartition: true,
        },
        lifecycleRules: [
          {
            expirationDays: 365,
            abortIncompleteMultipartUploadAfter: cdk.Duration.days(30),
          },
        ],
      },
    },
  },
};
