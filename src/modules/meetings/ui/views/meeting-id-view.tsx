"use client";

import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MeetingIdViewHeader } from "../components/meeting-id-view-header";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useConfirm } from "@/hooks/use-confirm";
import { useRouter } from "next/navigation";
import {useState} from "react";
import { UpdateMeetingDialog } from "../components/update-meeting-dialog";
interface Props{
    meetingId:string;
};

export const MeetingIdView = ({meetingId}:Props) => {
    const trpc=useTRPC();
    const router=useRouter();
    const queryClient=useQueryClient();
    const [updateMeetingOpen, setUpdateMeetingOpen]=useState(false);
const [RemoveConfirm, confirmRemove]=useConfirm(
    "Are you sure  ?",
    "This action cannot be undone"
);


    const {data} =useSuspenseQuery(
        trpc.meetings.getOne.queryOptions({id: meetingId}));

const removeMeeting =useMutation(trpc.meetings.remove.mutationOptions({
    onSuccess:()=>{
        queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions());
        router.push("/meetings");
    },
}));

const handleRemoveMeeting=async()=>{
    const confirmed=await confirmRemove();
    if(!confirmed) return;
    await removeMeeting.mutateAsync({id: meetingId});
};

return(
    <>
    <RemoveConfirmation/>
    <UpdateMeetingDialog 
    open={updateMeetingDialogOpen}
    onOpenChange={setUpdateMeetingDialogOpen}
        initialValues={data}
    />
    <div className="flex-1 py-4 px-4 md:px-8 flex flex-col gap-y-4">
        <MeetingIdViewHeader
        meetingId={meetingId}
        meetingName={data.name}
        onEdit={()=>setUpdateMeetingDialogOpen(true)}
        onRemove={handleRemoveMeeting}
        />
        {JSON.stringify(data,null,2)}
    </div>
    
    
    
    </>
)

};



export const MeetingIdViewLoading=() =>{
    return(
        <LoadingState
        title="Loading meeting "
        description="This may take a few seconds"
        />
    );
}

export const MeetingIdViewError=()=>{
    return(
        <ErrorState
        title="Error Loading meeting "
        description="Please try again later"
        />
    );
};
