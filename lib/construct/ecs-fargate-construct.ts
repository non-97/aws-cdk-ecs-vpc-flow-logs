import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NetworkConstruct } from "./network-construct";

export interface EcsFargateConstructProps {
  networkConstruct: NetworkConstruct;
  privateDnsNamespace: cdk.aws_servicediscovery.IPrivateDnsNamespace;
  discoveryName: string;
}

export class EcsFargateConstruct extends Construct {
  constructor(scope: Construct, id: string, props: EcsFargateConstructProps) {
    super(scope, id);

    // ECS Cluster
    const cluster = new cdk.aws_ecs.Cluster(this, "Cluster", {
      vpc: props.networkConstruct.vpc,
      containerInsights: true,
    });

    // Task definition
    const taskDefinition = new cdk.aws_ecs.FargateTaskDefinition(
      this,
      "TaskDefinition",
      {
        cpu: 256,
        memoryLimitMiB: 512,
        runtimePlatform: {
          cpuArchitecture: cdk.aws_ecs.CpuArchitecture.ARM64,
          operatingSystemFamily: cdk.aws_ecs.OperatingSystemFamily.LINUX,
        },
      }
    );

    taskDefinition.addContainer("NginxContainer", {
      image: cdk.aws_ecs.ContainerImage.fromRegistry(
        "public.ecr.aws/nginx/nginx:1.26-arm64v8"
      ),
      memoryLimitMiB: 256,
      portMappings: [
        {
          name: "nginx",
          containerPort: 80,
          appProtocol: cdk.aws_ecs.AppProtocol.http,
          protocol: cdk.aws_ecs.Protocol.TCP,
        },
      ],
      healthCheck: {
        command: ["CMD-SHELL", "curl -f http://localhost || exit 1"],
        retries: 2,
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(15),
        startPeriod: cdk.Duration.seconds(5),
      },
    });

    taskDefinition.addContainer("BusyboxContainer", {
      image: cdk.aws_ecs.ContainerImage.fromRegistry(
        "public.ecr.aws/docker/library/busybox:stable-glibc"
      ),
      memoryLimitMiB: 128,
      pseudoTerminal: true,
    });

    // ECS Service
    const service = new cdk.aws_ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition,
      desiredCount: 2,
      circuitBreaker: { enable: true },
      enableExecuteCommand: true,
      vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PUBLIC },
      assignPublicIp: true,
      serviceConnectConfiguration: {
        namespace: props.privateDnsNamespace.namespaceName,
        services: [
          {
            portMappingName: "nginx",
            port: 80,
            discoveryName: props.discoveryName,
          },
        ],
      },
    });

    service.connections.allowFrom(
      cdk.aws_ec2.Peer.ipv4(props.networkConstruct.vpc.vpcCidrBlock),
      cdk.aws_ec2.Port.HTTP
    );
  }
}
