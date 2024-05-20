import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { EcsProps } from "../parameter/index";
import { NetworkConstruct } from "./construct/network-construct";
import { EcsFargateConstruct } from "./construct/ecs-fargate-construct";

export interface EcsStackProps extends cdk.StackProps, EcsProps {}

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const networkConstruct = new NetworkConstruct(this, "NetworkConstruct", {
      ...props.network,
    });

    const privateDnsNamespace =
      new cdk.aws_servicediscovery.PrivateDnsNamespace(
        this,
        "PrivateDnsNamespace",
        {
          name: "local",
          vpc: networkConstruct.vpc,
        }
      );

    const ecsFargateConstruct = new EcsFargateConstruct(
      this,
      "EcsFargateConstruct",
      {
        networkConstruct,
        privateDnsNamespace,
        discoveryName: "ecs-fargate",
      }
    );
    ecsFargateConstruct.node.addDependency(privateDnsNamespace);

    const ecsFargateConstruct2 = new EcsFargateConstruct(
      this,
      "EcsFargateConstruct2",
      {
        networkConstruct,
        privateDnsNamespace,
        discoveryName: "ecs-fargate2",
      }
    );

    ecsFargateConstruct2.node.addDependency(privateDnsNamespace);
    ecsFargateConstruct2.node.addDependency(ecsFargateConstruct);

    networkConstruct.addFlowLog(ecsFargateConstruct2);
  }
}
