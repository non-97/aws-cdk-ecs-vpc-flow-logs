import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NetworkProperty, LifecycleRule } from "../../parameter/index";
import { LogBucketConstruct } from "./log-bucket-construct";

export interface NetworkConstructProps extends NetworkProperty {}

export class NetworkConstruct extends Construct {
  readonly vpc: cdk.aws_ec2.IVpc;
  readonly flowLogsOptions?: cdk.aws_ec2.S3DestinationOptions;
  readonly flowLogsTrafficType?: cdk.aws_ec2.FlowLogTrafficType;
  readonly flowLogsLifecycleRules?: LifecycleRule[];

  constructor(scope: Construct, id: string, props: NetworkConstructProps) {
    super(scope, id);

    // VPC
    const vpc = new cdk.aws_ec2.Vpc(this, "Default", {
      ipAddresses: cdk.aws_ec2.IpAddresses.cidr(props.vpcCidr),
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: props.natGateways,
      maxAzs: props.maxAzs,
      subnetConfiguration: props.subnetConfigurations,
      gatewayEndpoints: {
        S3: {
          service: cdk.aws_ec2.GatewayVpcEndpointAwsService.S3,
        },
      },
    });
    this.vpc = vpc;

    this.flowLogsOptions = props.vpcFlowLogs.options;
    this.flowLogsTrafficType = props.vpcFlowLogs.trafficType;
    this.flowLogsLifecycleRules = props.vpcFlowLogs.lifecycleRules;
  }

  // VPC Flow Logs
  addFlowLog = (dependencyConstruct?: Construct) => {
    const flowLogsBucketConstruct = new LogBucketConstruct(
      this,
      "FlowLogsBucket",
      {
        lifecycleRules: this.flowLogsLifecycleRules,
      }
    );

    const flowLogs = this.vpc.addFlowLog("FlowLogsToS3", {
      destination: cdk.aws_ec2.FlowLogDestination.toS3(
        flowLogsBucketConstruct.bucket,
        undefined,
        this.flowLogsOptions
      ),
      trafficType: this.flowLogsTrafficType,
      maxAggregationInterval:
        cdk.aws_ec2.FlowLogMaxAggregationInterval.TEN_MINUTES,
      logFormat: [
        cdk.aws_ec2.LogFormat.VERSION,
        cdk.aws_ec2.LogFormat.ACCOUNT_ID,
        cdk.aws_ec2.LogFormat.INTERFACE_ID,
        cdk.aws_ec2.LogFormat.SRC_ADDR,
        cdk.aws_ec2.LogFormat.DST_ADDR,
        cdk.aws_ec2.LogFormat.SRC_PORT,
        cdk.aws_ec2.LogFormat.DST_PORT,
        cdk.aws_ec2.LogFormat.PROTOCOL,
        cdk.aws_ec2.LogFormat.PACKETS,
        cdk.aws_ec2.LogFormat.BYTES,
        cdk.aws_ec2.LogFormat.START_TIMESTAMP,
        cdk.aws_ec2.LogFormat.END_TIMESTAMP,
        cdk.aws_ec2.LogFormat.ACTION,
        cdk.aws_ec2.LogFormat.LOG_STATUS,
        cdk.aws_ec2.LogFormat.VPC_ID,
        cdk.aws_ec2.LogFormat.SUBNET_ID,
        cdk.aws_ec2.LogFormat.INSTANCE_ID,
        cdk.aws_ec2.LogFormat.TCP_FLAGS,
        cdk.aws_ec2.LogFormat.TRAFFIC_TYPE,
        cdk.aws_ec2.LogFormat.PKT_SRC_ADDR,
        cdk.aws_ec2.LogFormat.PKT_DST_ADDR,
        cdk.aws_ec2.LogFormat.REGION,
        cdk.aws_ec2.LogFormat.AZ_ID,
        cdk.aws_ec2.LogFormat.SUBLOCATION_TYPE,
        cdk.aws_ec2.LogFormat.SUBLOCATION_ID,
        cdk.aws_ec2.LogFormat.PKT_SRC_AWS_SERVICE,
        cdk.aws_ec2.LogFormat.PKT_DST_AWS_SERVICE,
        cdk.aws_ec2.LogFormat.FLOW_DIRECTION,
        cdk.aws_ec2.LogFormat.TRAFFIC_PATH,
      ],
    });

    const cfnFlowLogs = flowLogs.node.defaultChild as cdk.aws_ec2.CfnFlowLog;
    cfnFlowLogs.logFormat +=
      "  \
      ${ecs-cluster-name} \
      ${ecs-cluster-arn} \
      ${ecs-container-instance-id} \
      ${ecs-container-instance-arn} \
      ${ecs-service-name} \
      ${ecs-task-definition-arn} \
      ${ecs-task-id} \
      ${ecs-task-arn} \
      ${ecs-container-id} \
      ${ecs-second-container-id}";

    if (dependencyConstruct) {
      flowLogs.node.addDependency(dependencyConstruct);
    }
  };
}
